import { supabase, getPool, getRemainingPool, getBalance } from "../db";
import { t, merchantMenuStr, tierConfig, floorToFive } from "../utils";
import { SKU, RESTOCK_PHONE } from "../config";
import { handleHubMenu } from "./hub";

export async function handleMerchantMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  // parts[0] is "3" (Continue)
  const subChoice = parts[1];

  if (!subChoice) {
    return `CON ${merchantMenuStr(user, lang)}`;
  }

  switch (subChoice) {
    case "1": // NX Wallet
      return await handleNxWallet(phoneNumber, lang, parts, user);
    case "2": // Restock
      return await handleRestock(phoneNumber, lang, parts, user);
    case "3": // Settings
      return await handleSettings(phoneNumber, lang, parts, user);
    case "4": // Confirm Delivery
      return await handleConfirmDelivery(phoneNumber, lang, parts, user);
    case "5": // My Hub
      if (user.franchise_tier !== "HUB") return `END ${t(lang, "not_a_hub")}`;
      return await handleHubMenu(phoneNumber, lang, parts, user);
    default:
      return `CON ${merchantMenuStr(user, lang)}`;
  }
}

async function handleNxWallet(phoneNumber: string, lang: string, parts: string[], user: any) {
  // 3*1 -> Choice
  const action = parts[2];

  const pool = await getPool(user.merchant_code);
  const remaining = await getRemainingPool(user.merchant_code);
  const earnings = await getBalance(phoneNumber);

  const utilization = pool > 0 ? ((1 - (remaining / pool)) * 100) : 100;
  const cfg = tierConfig(user);
  const usable = floorToFive(earnings * cfg.poolRate);

  if (!action) {
    return `CON ${t(lang, "nx_wallet", { 
      code: user.merchant_code, 
      pool: pool.toFixed(0), 
      redeemed: earnings.toFixed(0), 
      usable: usable.toFixed(0), 
      util: utilization.toFixed(0),
      rate: (cfg.poolRate * 100).toFixed(0)
    })}\n1 Daily Summary\n2 Settle Invoice`;
  }

  if (action === "1") {
    // 3*1*1 -> Daily Summary
    // We need more detailed stats here: txns, cash, volume, red, earn
    const todayStr = new Date().toISOString().slice(0, 10);
    const { data: txns } = await supabase.from("transactions")
      .select("cash_paid, nx_redeemed, nx_earned")
      .eq("merchant_code", user.merchant_code)
      .eq("status", "confirmed")
      .gte("created_at", todayStr);

    const stats = (txns || []).reduce((acc: any, t: any) => {
      acc.txn_count += 1;
      acc.total_cash += Number(t.cash_paid || 0);
      acc.total_redeemed += Number(t.nx_redeemed || 0);
      acc.total_earned_by_cust += Number(t.nx_earned || 0);
      return acc;
    }, { txn_count: 0, total_cash: 0, total_redeemed: 0, total_earned_by_cust: 0 });

    return `END ${t(lang, "daily_summary", {
      txns: stats?.txn_count || 0,
      cash: stats?.total_cash || 0,
      vol: (stats?.total_cash || 0) + (stats?.total_redeemed || 0),
      red: stats?.total_redeemed || 0,
      earn: stats?.total_earned_by_cust || 0
    })}`;
  }

  if (action === "2") {
    // 3*1*2 -> Settle Invoice
    const { data: inv } = await supabase.from("restock_invoices")
      .select("*")
      .eq("merchant_code", user.merchant_code)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!inv) return `END ${t(lang, "no_invoice")}`;

    const nxPayable = Math.min(usable, floorToFive(inv.invoice_amount * cfg.poolRate));
    const cashDue = inv.invoice_amount - nxPayable;

    if (parts.length === 3) {
      return `CON ${t(lang, "invoice_preview", {
        amount: inv.invoice_amount,
        avail: earnings.toFixed(0),
        pay: nxPayable,
        cash: cashDue
      })}\n1 Confirm\n2 Cancel`;
    }

    if (parts[3] === "1") {
      // 3*1*2*1 -> Confirm
      await supabase.from("restock_invoices").update({
        status: "paid",
        nx_paid: nxPayable,
        cash_due: cashDue,
        paid_at: new Date().toISOString()
      }).eq("id", inv.id);

      const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 99);
      await supabase.from("ledger_entries").insert({
        account_phone: phoneNumber,
        entry_type: "debit",
        amount: -nxPayable,
        reference: `SETTLE-INV-${inv.id}`,
        expires_at: expiresAt.toISOString()
      });

      // Update pool? In prototype we just return success with details
      const poolInc = Math.floor(nxPayable * 0.5); // Example calculation
      return `END ${t(lang, "invoice_settled", {
        used: nxPayable,
        ret: (earnings - nxPayable).toFixed(0),
        cash: cashDue,
        pool_inc: poolInc
      })}`;
    }
  }

  return `CON ${merchantMenuStr(user, lang)}`;
}

async function handleRestock(phoneNumber: string, lang: string, parts: string[], user: any) {
  if (parts.length === 2) {
    return `CON ${t(lang, "enter_restock")}`;
  }

  const input = parts[2] || "";
  if (!input) return `END ${t(lang, "order_empty")}`;

  // Fuzzy parsing logic
  const parseOrder = (text: string) => {
    // splits by , or * if multiple items? 
    // User examples: BR*10,ML*5
    const items = text.split(/[,,]/).map(item => {
      const bits = item.split("*");
      let code = bits[0].toUpperCase().trim();
      const qty = bits[1] || "1";
      
      // Fuzzy match code against SKU keys
      const s = SKU[lang === "en" ? "en" : "sw"];
      if (!s[code]) {
        // Try reverse lookup or partial
        const match = Object.entries(s).find(([k, v]) => 
            v.toLowerCase().includes(code.toLowerCase()) || 
            k.toLowerCase().includes(code.toLowerCase())
        );
        if (match) code = match[0];
      }
      
      return { 
        name: s[code] || code,
        qty: qty
      };
    });
    return items;
  };

  const items = parseOrder(input);
  const itemsStr = items.map(it => `${it.name} x${it.qty}`).join("\n");

  if (parts.length === 3) {
      return `CON ${t(lang, "order_review", { items: itemsStr })}`;
  }

  if (parts[3] === "1") {
    const { data: req, error: insErr } = await supabase.from("restock_requests").insert({
        merchant_code: user.merchant_code,
        merchant_phone: phoneNumber,
        raw_input: input,
        items: items, // JSONB
        status: "pending"
    }).select().single();

    if (insErr) return `END ${t(lang, "error")}`;

    // Auto-batch recognized SKUs
    try {
      const { openOrGetBatch } = await import("../../../services/batchHelper");
      for (const item of items) {
        // Find SKU code from SKU map
        const s = SKU[lang === "en" ? "en" : "sw"];
        const skuCode = Object.entries(s).find(([k, v]) => v === item.name)?.[0];
        
        if (skuCode && req) {
          const { data: batchId } = await openOrGetBatch(supabase, skuCode, null, parseInt(item.qty));
          if (batchId) {
            await supabase.from("restock_requests").update({ 
               batch_id: batchId,
               sku_code: skuCode,
               sku_name: item.name,
               quantity: parseInt(item.qty),
               fuzzy_resolved: true
            }).eq("id", req.id);
          }
        }
      }
    } catch (e) {
      console.warn("Auto-batching failed in USSD:", e);
    }

    return `END ${t(lang, "order_sent_detail", { items: itemsStr })}`;
  }

  return `END ${t(lang, "cancelled")}`;
}

async function handleSettings(phoneNumber: string, lang: string, parts: string[], user: any) {
  if (parts.length === 2) {
      return `CON ${t(lang, "settings_menu")}`;
  }

  const choice = parts[2];
  if (choice === "1") return `END ${t(lang, "your_code", { code: user.merchant_code })}`;
  
  if (choice === "2") {
      if (parts.length === 3) return `CON ${t(lang, "enter_accept_pct")}`;
      const pct = parseInt(parts[3]);
      const cfg = tierConfig(user);
      const maxPct = Math.round(cfg.acceptCeiling * 100);
      if (isNaN(pct) || pct < 10 || pct > maxPct) {
          return `END Invalid: must be between 10% and ${maxPct}% based on your tier constraints.`;
      }
      
      await supabase.from("users").update({ acceptance_percent: pct / 100 }).eq("phone", phoneNumber);
      return `END ${t(lang, "pct_updated", { pct })}`;
  }

  if (choice === "3") {
      const cfg = tierConfig(user);
      return `END ${t(lang, "tier_status_detail", {
          tier: user.franchise_tier,
          pool_pct: (cfg.poolRate * 100).toFixed(0),
          accept_pct: (cfg.acceptCeiling * 100).toFixed(0),
          fee: cfg.monthlyFeeKes
      })}`;
  }

  return `CON ${merchantMenuStr(user, lang)}`;
}

async function handleConfirmDelivery(phoneNumber: string, lang: string, parts: string[], user: any) {
  // Check if they have an active pending or predicting restock request
  const { data: activeRequests } = await supabase
    .from('restock_requests')
    .select('id')
    .eq('merchant_code', user.merchant_code)
    .in('status', ['pending', 'approving_prediction'])
    .limit(1);

  const hasPendingRequest = activeRequests && activeRequests.length > 0;

  if (!hasPendingRequest) {
    return `END ${lang === 'en' 
      ? 'You must have a pending restock request to confirm delivery!' 
      : 'Lazima uwe na ombi la restock linalosubiri ili kuthibitisha mzigo!'}`;
  }

  // Check for any pending delivery invoices
  const { data: pendingInvs } = await supabase
    .from('restock_invoices')
    .select('*')
    .eq('merchant_code', user.merchant_code)
    .is('delivered_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  const inv = pendingInvs && pendingInvs[0];
  if (!inv) {
    return `END ${lang === 'en'
      ? 'No pending delivery invoices found for your shop.' 
      : 'Hakuna ankara za utoaji zinazosubiri duka lako.'}`;
  }

  // If no parts entered after choice: parts is ["3", "4"] (length 2)
  if (parts.length === 2) {
    const invLabel = inv.invoice_number || inv.id.slice(0, 8);
    const amount = inv.total_amount || inv.invoice_amount || 0;
    return `CON ${lang === 'en'
      ? `Confirm Delivery\nInvoice: #${invLabel}\nValue: KSH ${amount.toLocaleString()}\n\n1 Confirm Handshake\n2 Cancel`
      : `Thibitisha Mzigo\nAnkara: #${invLabel}\nKiasi: KSH ${amount.toLocaleString()}\n\n1 Thibitisha\n2 Kataa`
    }`;
  }

  const userAction = parts[2];
  if (userAction === "1") {
    // Perform handover update
    await supabase
      .from('restock_invoices')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', inv.id);

    // Record handshake with dummy/none agent
    await supabase
      .from('delivery_handshakes')
      .insert({
        invoice_id: inv.id,
        merchant_code: user.merchant_code,
        agent_code: 'DIRECT',
        status: 'success'
      });

    // Save project log
    await supabase
      .from('project_logs')
      .insert({
        level: 'info',
        module: 'USSD',
        message: `USSD Handshake delivery confirmed directly for invoice ${inv.id}`,
        metadata: { invoice_id: inv.id, merchant_code: user.merchant_code }
      });

    return `END ${lang === 'en' 
      ? 'Delivery Successful!\nShop restocked. Happy selling!' 
      : 'Mzigo umepokelewa!\nDuka limeongezewa bidhaa. Karibu tena!'}`;
  }

  return `END ${t(lang, "cancelled")}`;
}
