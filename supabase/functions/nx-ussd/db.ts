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
  const { id, customer_phone, nx_earned = 0, nx_redeemed = 0, transaction_code, merchant_phone } = txn;
  try {
    const { error: txErr } = await supabase.from("transactions").update({ status: "completed" }).eq("id", id);
    if (txErr) {
      const { error: fallbackErr } = await supabase.from("transactions").update({ status: "confirmed" }).eq("id", id);
      if (fallbackErr) throw fallbackErr;
      const entries = [];
      if (nx_earned > 0) entries.push({ account_phone: customer_phone, entry_type: 'credit', amount: nx_earned, reference: transaction_code, expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString() });
      if (nx_redeemed > 0) {
        entries.push({ account_phone: customer_phone, entry_type: 'debit', amount: -nx_redeemed, reference: transaction_code, expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString() });
        entries.push({ account_phone: merchant_phone, entry_type: 'credit', amount: nx_redeemed, reference: transaction_code, expires_at: new Date(Date.now() + 99 * 365 * 24 * 3600 * 1000).toISOString() });
      }
      if (entries.length) await supabase.from("ledger_entries").insert(entries);
      if (customer_phone) await supabase.from("users").update({ nx_balance: 0, is_first_purchase_used: true, cancellation_count: 0 }).eq("phone", customer_phone);
    } else {
      if (customer_phone) await supabase.from("users").update({ is_first_purchase_used: true, cancellation_count: 0 }).eq("phone", customer_phone);
    }
    return true;
  } catch (err) {
    console.error("merchantFinalise Error:", err);
    return false;
  }
}
