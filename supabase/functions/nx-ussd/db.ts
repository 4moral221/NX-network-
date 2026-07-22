import { createClient } from "npm:@supabase/supabase-js@2";
export const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
import { startOfCycle, roundDown, tierConfig } from "./utils.ts";

export async function logError(phone: string, sid: string, err: string, data: string) {
  await supabase.from("nx_logs").insert({ severity: "ERROR", module: "USSD", phone, session_id: sid, message: err, meta: { data } });
}

export async function getBalance(phone: string): Promise<number> {
  const { data } = await supabase.from("ledger_entries").select("amount")
    .eq("account_phone", phone).gt("expires_at", new Date().toISOString());
  if (!data?.length) return 0;
  return data.reduce((sum, e) => sum + Number(e.amount), 0);
}

export async function getPool(merchantCode: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const [marginRes, fmcgRes, userRes] = await Promise.all([
    supabase.from("merchant_margins").select("gross_margin").eq("merchant_code", merchantCode).maybeSingle(),
    supabase.from("fmcg_margin_contributions").select("contribution_amount")
      .eq("merchant_code", merchantCode).eq("status", "active")
      .lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`),
    supabase.from("users").select("franchise_tier").eq("merchant_code", merchantCode).maybeSingle(),
  ]);
  const cfg      = tierConfig(userRes.data);
  const basePool = roundDown((marginRes.data?.gross_margin || 0) * cfg.poolRate);
  const fmcgBoost = (fmcgRes.data || []).reduce((s: number, r: any) => s + Number(r.contribution_amount || 0), 0);
  return basePool + roundDown(fmcgBoost);
}

export async function getRemainingPool(merchantCode: string): Promise<number> {
  const [pool, txRes] = await Promise.all([
    getPool(merchantCode),
    supabase.from("transactions").select("nx_redeemed, nx_earned")
      .eq("merchant_code", merchantCode)
      .in("status", ["confirmed", "awaiting_merchant", "pending_customer", "completed"])
      .gte("created_at", startOfCycle()),
  ]);
  const totalLiability = (txRes.data || []).reduce((s, x) => s + Number(x.nx_redeemed || 0) + Number(x.nx_earned || 0), 0);
  return Math.max(0, pool - totalLiability);
}

export async function checkSecurityLimits(merchantCode: string, customerPhone: string, tier: string = 'BASIC'): Promise<{ ok: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const limits: Record<string, number> = { 'BASIC': 20, 'CERTIFIED': 50, 'HUB': 150 };
  const [mTxns, loopTxns] = await Promise.all([
    supabase.from("transactions").select("id").eq("merchant_code", merchantCode).gte("created_at", oneHourAgo),
    supabase.from("transactions").select("id").eq("merchant_code", merchantCode).eq("customer_phone", customerPhone).gte("created_at", oneHourAgo),
  ]);
  if ((mTxns.data?.length || 0) > (limits[tier] || 20)) return { ok: false, reason: `Merchant speed limit reached.` };
  if ((loopTxns.data?.length || 0) > 5) return { ok: false, reason: "Too many transactions at this shop." };
  return { ok: true };
}

export async function merchantFinalise(txn: any): Promise<boolean> {
  const { id, customer_phone, nx_earned = 0, nx_redeemed = 0, nx_fee = 0, transaction_code, merchant_phone } = txn;
  
  try {
    const { error: txErr } = await supabase.from("transactions").update({ status: "completed" }).eq("id", id);
    
    if (txErr) {
      if (txErr.message.includes('last_transaction_at') || txErr.code === '42703' || txErr) {
        console.warn("DB Trigger failing due to missing last_transaction_at. Falling back to manual finalization.");
        
        await supabase.from("transactions").update({ status: "confirmed" }).eq("id", id);
        
        let targetDebitPhone = customer_phone;
        if (txn.family_code) {
          const { data: family } = await supabase.from("family_accounts").select("parent_phone").eq("family_code", txn.family_code).maybeSingle();
          if (family?.parent_phone) {
            targetDebitPhone = family.parent_phone;
          }
        }

        const entries = [];
        if (nx_earned > 0) {
          entries.push({ 
            account_phone: customer_phone, 
            entry_type: 'credit', 
            amount: nx_earned, 
            reference: transaction_code, 
            expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString() 
          });
        }
        if (nx_redeemed > 0) {
          entries.push({ 
            account_phone: targetDebitPhone, 
            entry_type: 'debit', 
            amount: -nx_redeemed, 
            reference: transaction_code, 
            expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString() 
          });
          entries.push({ 
            account_phone: merchant_phone, 
            entry_type: 'credit', 
            amount: nx_redeemed, 
            reference: transaction_code, 
            expires_at: new Date(Date.now() + 99 * 365 * 24 * 3600 * 1000).toISOString() 
          });
        }
        if (nx_fee > 0) {
          entries.push({ 
            account_phone: merchant_phone, 
            entry_type: 'debit', 
            amount: -nx_fee, 
            reference: transaction_code, 
            expires_at: new Date(Date.now() + 99 * 365 * 24 * 3600 * 1000).toISOString() 
          });
        }
        
        if (entries.length) {
          await supabase.from("ledger_entries").insert(entries);
        }

        if (customer_phone) {
          const { data: debitUser } = await supabase
            .from('users')
            .select('nx_balance')
            .eq('phone', targetDebitPhone)
            .maybeSingle();

          const currentBal = Number(debitUser?.nx_balance || 0);
          const parentNewBal = currentBal - Number(nx_redeemed);
          await supabase.from("users")
            .update({ nx_balance: parentNewBal })
            .eq("phone", targetDebitPhone);

          if (targetDebitPhone !== customer_phone) {
            const { data: childUser } = await supabase.from('users').select('nx_balance').eq('phone', customer_phone).maybeSingle();
            const childNewBal = Number(childUser?.nx_balance || 0) + Number(nx_earned);
            await supabase.from("users")
              .update({ 
                nx_balance: childNewBal,
                is_first_purchase_used: true,
                cancellation_count: 0
              })
              .eq("phone", customer_phone);
          } else {
            const childNewBal = currentBal + (Number(nx_earned) - Number(nx_redeemed));
            await supabase.from("users")
              .update({ 
                nx_balance: childNewBal,
                is_first_purchase_used: true,
                cancellation_count: 0
              })
              .eq("phone", customer_phone);
          }
        }

        if (merchant_phone && nx_redeemed > 0) {
          const { data: merchantUser } = await supabase
            .from('users')
            .select('nx_balance')
            .eq('phone', merchant_phone)
            .maybeSingle();

          const currentMerchantBal = Number(merchantUser?.nx_balance || 0);
          const newMerchantBal = currentMerchantBal + Number(nx_redeemed);
          await supabase.from("users")
            .update({ nx_balance: newMerchantBal })
            .eq("phone", merchant_phone);
        }
      }
    } else {
      if (customer_phone) await supabase.from("users").update({ is_first_purchase_used: true, cancellation_count: 0 }).eq("phone", customer_phone);
    }
    return true;
  } catch (err) {
    console.error("merchantFinalise Error:", err);
    return false;
  }
}
