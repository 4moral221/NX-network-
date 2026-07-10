import { supabase, getPool, getRemainingPool, getBalance } from "../db.ts";
import { t, merchantMenuStr, tierConfig, floorToFive } from "../utils.ts";
import { SKU } from "../config.ts";
import { handleHubMenu } from "./hub.ts";

export async function handleMerchantMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  const subChoice = parts[1];
  if (!subChoice) return `CON ${merchantMenuStr(user, lang)}`;
  switch (subChoice) {
    case "1": return await handleNxWallet(phoneNumber, lang, parts, user);
    case "2": return await handleRestock(phoneNumber, lang, parts, user);
    case "3": return await handleSettings(phoneNumber, lang, parts, user);
    case "4": return await handleConfirmDelivery(phoneNumber, lang, parts, user);
    case "5": if (user.franchise_tier !== "HUB") return `END Not a Hub.`; return await handleHubMenu(phoneNumber, lang, parts, user);
    default:  return `CON ${merchantMenuStr(user, lang)}`;
  }
}

async function handleNxWallet(phoneNumber: string, lang: string, parts: string[], user: any) {
  const pool = await getPool(user.merchant_code);
  const remaining = await getRemainingPool(user.merchant_code);
  const earnings = await getBalance(phoneNumber);
  const utilization = pool > 0 ? ((1 - (remaining / pool)) * 100) : 100;
  const cfg = tierConfig(user);
  const usable = floorToFive(earnings * cfg.poolRate);
  const action = parts[2];
  if (!action) return `CON ${t(lang, "nx_wallet", { code: user.merchant_code, pool: pool.toFixed(0), redeemed: earnings.toFixed(0), usable: usable.toFixed(0), util: utilization.toFixed(0), rate: (cfg.poolRate * 100).toFixed(0) })}\n1 Daily Summary\n2 Settle Invoice`;
  if (action === "1") {
    const { data: stats } = await supabase.from("v_merchant_stats_daily").select("*").eq("merchant_code", user.merchant_code).maybeSingle();
    return `END ${t(lang, "daily_summary", { txns: stats?.txn_count || 0, cash: stats?.total_cash || 0, vol: (stats?.total_cash || 0) + (stats?.total_redeemed || 0), red: stats?.total_redeemed || 0, earn: stats?.total_earned_by_cust || 0 })}`;
  }
  if (action === "2") {
    const { data: inv } = await supabase.from("restock_invoices").select("*").eq("merchant_code", user.merchant_code).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!inv) return `END No pending invoice.`;
    const nxPayable = Math.min(usable, floorToFive(inv.invoice_amount * cfg.poolRate));
    const cashDue = inv.invoice_amount - nxPayable;
    if (parts.length === 3) return `CON ${t(lang, "invoice_preview" as any, { amount: inv.invoice_amount, avail: earnings.toFixed(0), pay: nxPayable, cash: cashDue }) || `Invoice: KES ${inv.invoice_amount}\nNX: ${nxPayable} | Cash: ${cashDue}\n1 Confirm\n2 Cancel`}`;
    if (parts[3] === "1") {
      await supabase.from("restock_invoices").update({ status: "paid", nx_paid: nxPayable, cash_due: cashDue, paid_at: new Date().toISOString() }).eq("id", inv.id);
      const expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 99);
      await supabase.from("ledger_entries").insert({ account_phone: phoneNumber, entry_type: "debit", amount: -nxPayable, reference: `SETTLE-INV-${inv.id}`, expires_at: expiresAt.toISOString() });
      return `END ${t(lang, "invoice_settled", { used: nxPayable, ret: (earnings - nxPayable).toFixed(0), cash: cashDue, pool_inc: Math.floor(nxPayable * 0.5) })}`;
    }
  }
  return `CON ${merchantMenuStr(user, lang)}`;
}

async function handleRestock(phoneNumber: string, lang: string, parts: string[], user: any) {
  if (parts.length === 2) return `CON ${t(lang, "enter_restock")}`;
  const input = parts[2] || "";
  if (!input) return `END Order is empty.`;
  const parseOrder = (text: string) => text.split(/[,,]/).map(item => {
    const bits = item.split("*"); let code = bits[0].toUpperCase().trim(); const qty = bits[1] || "1";
    const s = SKU["en"]; if (!s[code]) { const match = Object.entries(s).find(([k, v]) => v.toLowerCase().includes(code.toLowerCase()) || k.toLowerCase().includes(code.toLowerCase())); if (match) code = match[0]; }
    return { name: s[code] || code, qty };
  });
  const items = parseOrder(input);
  const itemsStr = items.map(it => `${it.name} x${it.qty}`).join("\n");
  if (parts.length === 3) return `CON ${t(lang, "order_review", { items: itemsStr })}`;
  if (parts[3] === "1") {
    await supabase.from("restock_requests").insert({ merchant_code: user.merchant_code, merchant_phone: phoneNumber, raw_input: input, items, status: "pending", source: "ussd" });
    return `END ${t(lang, "order_sent_detail", { items: itemsStr })}`;
  }
  return `END Cancelled.`;
}

async function handleSettings(phoneNumber: string, lang: string, parts: string[], user: any) {
  if (parts.length === 2) return `CON ${t(lang, "settings_menu")}`;
  const choice = parts[2];
  if (choice === "1") return `END Your Code: ${user.merchant_code}`;
  if (choice === "2") {
    if (parts.length === 3) return `CON Enter acceptance % (10-40):`;
    const pct = parseInt(parts[3]);
    if (isNaN(pct) || pct < 10 || pct > 40) return `END Invalid %. Must be 10-40.`;
    await supabase.from("users").update({ acceptance_percent: pct / 100 }).eq("phone", phoneNumber);
    return `END Acceptance set to ${pct}%.`;
  }
  if (choice === "3") {
    const cfg = tierConfig(user);
    return `END ${t(lang, "tier_status_detail", { tier: user.franchise_tier, pool_pct: (cfg.poolRate * 100).toFixed(0), accept_pct: (cfg.acceptCeiling * 100).toFixed(0), fee: cfg.monthlyFeeKes })}`;
  }
  return `CON ${merchantMenuStr(user, lang)}`;
}

async function handleConfirmDelivery(phoneNumber: string, lang: string, parts: string[], user: any) {
  const { data: request } = await supabase.from("restock_requests").select("*").eq("merchant_code", user.merchant_code).in("status", ["pending", "dispatched", "approved"]).order("requested_at", { ascending: false }).limit(1).maybeSingle();
  if (!request) return t(lang, "no_pending_delivery");
  if (parts.length === 2) return t(lang, "confirm_delivery_prompt");
  if (parts[2] === "1") {
    await supabase.from("restock_requests").update({ status: "delivered", fulfilled_at: new Date().toISOString() }).eq("id", request.id);
    return t(lang, "delivery_confirmed");
  }
  return `END Cancelled.`;
}
