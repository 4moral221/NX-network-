import { supabase, getBalance, getPool, getRemainingPool, checkSecurityLimits } from "../db.ts";
import { t, isValidAmount, floorToFive, tierConfig } from "../utils.ts";

export async function handleCustomerMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  const subChoice = parts[1];
  if (!subChoice) return `CON ${t(lang, "customer_menu")}`;
  switch (subChoice) {
    case "1": return await handlePayWithNX(phoneNumber, lang, parts, user);
    case "2": {
      const bal = await getBalance(phoneNumber);
      return t(lang, "nx_balance", { bal });
    }
    case "3": return await handleFamilyAccountMenu(phoneNumber, lang, parts, user);
    case "4": return `END ${t(lang, "help")}`;
    default:  return `CON ${t(lang, "customer_menu")}`;
  }
}

async function handleFamilyAccountMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  const option = parts[2];

  if (!option) {
    return `CON ${t(lang, "family_menu")}`;
  }

  if (option === "1") {
    const { data: existing } = await supabase.from("family_accounts").select("family_code").eq("parent_phone", phoneNumber).maybeSingle();
    if (existing) {
      return `END ${t(lang, "family_created", { code: existing.family_code })}`;
    }

    const code = "FAM" + Math.floor(10000 + Math.random() * 90000);
    const { error } = await supabase.from("family_accounts").insert({
      parent_phone: phoneNumber,
      family_code: code,
      status: "active",
      allow_spending: true
    });

    if (error) return `END ${t(lang, "tx_failed")}`;
    return `END ${t(lang, "family_created", { code })}`;
  }

  if (option === "2") {
    const { data: family } = await supabase.from("family_accounts").select("*").eq("parent_phone", phoneNumber).maybeSingle();
    if (!family) {
      return `END ${t(lang, "family_no_info")}`;
    }

    const bal = await getBalance(phoneNumber);
    return `END ${t(lang, "family_info", {
      code: family.family_code,
      parent: phoneNumber,
      spending: family.allow_spending ? "ENABLED" : "DISABLED",
      bal: String(bal)
    })}`;
  }

  return `END Invalid option.`;
}

async function handlePayWithNX(phoneNumber: string, lang: string, parts: string[], user: any) {
  if (parts.length === 2) return `CON ${t(lang, "enter_merchant_code")}`;
  if (parts.length === 3) {
    const mCode = parts[2].trim().toUpperCase();
    const { data: merchant } = await supabase.from("users").select("name, merchant_code, phone").eq("merchant_code", mCode).maybeSingle();
    if (!merchant) return `END ${t(lang, "invalid_merchant_code")}`;
    return `CON ${t(lang, "enter_amount")}`;
  }
  if (parts.length === 4) {
    const mCode = parts[2].trim().toUpperCase();
    const amount = Number(parts[3]);
    if (!isValidAmount(amount)) return `CON ${t(lang, "enter_amount")}\n${t(lang, "invalid_amount")}`;
    const [merchant, balance, remainingPool, totalPool] = await Promise.all([
      supabase.from("users").select("name, phone, franchise_tier, merchant_code").eq("merchant_code", mCode).maybeSingle(),
      getBalance(phoneNumber), getRemainingPool(mCode), getPool(mCode)
    ]);
    if (!merchant.data) return `END ${t(lang, "invalid_merchant_code")}`;
    const m = merchant.data;
    const limits = await checkSecurityLimits(mCode, phoneNumber, m.franchise_tier);
    if (!limits.ok) return `END ${limits.reason}`;
    const utilization = totalPool > 0 ? (1 - (remainingPool / totalPool)) : 1;
    let earnMultiplier = utilization >= 0.9 ? 0 : utilization >= 0.7 ? 0.25 : utilization >= 0.4 ? 0.5 : 1.0;
    const cfg = tierConfig(m);
    let effectiveAcceptancePct = utilization >= 0.9 ? 0 : utilization >= 0.7 ? Math.min(0.10, cfg.acceptCeiling) : utilization >= 0.4 ? Math.min(0.20, cfg.acceptCeiling) : cfg.acceptCeiling;
    let nxRedeem = floorToFive(Math.min(balance, amount * effectiveAcceptancePct, remainingPool));
    const earnRate = user.is_first_purchase_used ? 0.05 : 0.10;
    let nxEarned = Math.floor((amount - nxRedeem) * earnRate * earnMultiplier);
    if (nxRedeem + nxEarned > remainingPool) nxEarned = Math.max(0, remainingPool - nxRedeem);
    const nxFee = balance > 0 ? 2 : 0;
    const txnCode = "NX" + Math.random().toString(36).substring(7).toUpperCase();
    return `CON ${t(lang, "customer_confirm_pay", { shop: m.name, code: m.merchant_code, phone: phoneNumber, amount, cash: amount - nxRedeem, nx: nxRedeem, earn: nxEarned, rate: (earnRate * earnMultiplier * 100).toFixed(0), fee: nxFee, txn: txnCode })}`;
  }
  if (parts.length === 5) {
    if (parts[4] !== "1") return `END Payment cancelled.`;
    const mCode = parts[2].trim().toUpperCase();
    const amount = Number(parts[3]);
    const [merchant, balance, remainingPool, totalPool] = await Promise.all([
      supabase.from("users").select("name, phone, franchise_tier, merchant_code").eq("merchant_code", mCode).maybeSingle(),
      getBalance(phoneNumber), getRemainingPool(mCode), getPool(mCode)
    ]);
    const m = merchant.data;
    if (!m) return `END ${t(lang, "invalid_merchant_code")}`;
    const limits = await checkSecurityLimits(mCode, phoneNumber, m.franchise_tier);
    if (!limits.ok) return `END ${limits.reason}`;
    const utilization = totalPool > 0 ? (1 - (remainingPool / totalPool)) : 1;
    let earnMultiplier = utilization >= 0.9 ? 0 : utilization >= 0.7 ? 0.25 : utilization >= 0.4 ? 0.5 : 1.0;
    const cfg = tierConfig(m);
    let effectiveAcceptancePct = utilization >= 0.9 ? 0 : utilization >= 0.7 ? Math.min(0.10, cfg.acceptCeiling) : utilization >= 0.4 ? Math.min(0.20, cfg.acceptCeiling) : cfg.acceptCeiling;
    let nxRedeem = floorToFive(Math.min(balance, amount * effectiveAcceptancePct, remainingPool));
    const nxFee = balance > 0 ? 2 : 0;
    const earnRate = user.is_first_purchase_used ? 0.05 : 0.10;
    let nxEarned = Math.floor((amount - nxRedeem) * earnRate * earnMultiplier);
    if (nxRedeem + nxEarned > remainingPool) nxEarned = Math.max(0, remainingPool - nxRedeem);
    const txnCode = "NX" + Math.random().toString(36).substring(7).toUpperCase();
    const { error } = await supabase.from("transactions").insert({ merchant_code: mCode, merchant_phone: m.phone, customer_phone: phoneNumber, amount, nx_redeemed: nxRedeem, nx_earned: nxEarned, nx_fee: nxFee, cash_paid: amount - nxRedeem, status: "awaiting_merchant", transaction_code: txnCode }).select().single();
    if (error) return `END ${t(lang, "tx_failed")}`;
    return `END ${t(lang, "customer_req_sent", { txn: txnCode })}`;
  }
  return `END Invalid option.`;
}
