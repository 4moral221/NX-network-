import { supabase, getBalance, getPool, getRemainingPool, checkSecurityLimits } from "../db";
import { t, isValidAmount, floorToFive, tierConfig } from "../utils";

export async function handleCustomerMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  // parts[0] is always "3" (Continue) or simulating a shortcut
  const subChoice = parts[1];

  if (!subChoice) {
    return `CON ${t(lang, "customer_menu")}`;
  }

  switch (subChoice) {
    case "1": // Pay with NX
      return await handlePayWithNX(phoneNumber, lang, parts, user);
    case "2": // Balance
      const bal = await getBalance(phoneNumber);
      return `END ${t(lang, "nx_balance", { bal })}`;
    case "3": // Family Account
      return await handleFamilyAccountMenu(phoneNumber, lang, parts, user);
    case "4": // Help
      return `END ${t(lang, "help")}`;
    default:
      return `CON ${t(lang, "customer_menu")}`;
  }
}

async function handleFamilyAccountMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  // parts: ["3", "3", ...]
  // parts[2] is the family option choice: "1" (Pay), "2" (Create), "3" (View Info)
  const option = parts[2];

  if (!option) {
    return `CON ${t(lang, "family_menu")}`;
  }

  if (option === "1") {
    // Family Payment
    // parts[3]: familyCode
    // parts[4]: merchantCode
    // parts[5]: amount
    // parts[6]: confirm choice ("1" or "2")
    if (parts.length === 3) {
      return `CON ${t(lang, "enter_family_code")}`;
    }

    const familyCode = parts[3].trim().toUpperCase();
    
    // Find family account
    const { data: family } = await supabase.from("family_accounts").select("*").eq("family_code", familyCode).maybeSingle();
    if (!family) {
      return `END ${t(lang, "family_not_found")}`;
    }
    if (!family.allow_spending || family.status !== "active") {
      return `END ${t(lang, "family_spending_disabled")}`;
    }

    if (parts.length === 4) {
      return `CON ${t(lang, "enter_merchant_code")}`;
    }

    const mCode = parts[4].trim().toUpperCase();
    const { data: merchant } = await supabase.from("users").select("name, merchant_code, phone, franchise_tier").eq("merchant_code", mCode).maybeSingle();
    if (!merchant || !merchant.merchant_code) return `END ${t(lang, "invalid_merchant_code")}`;

    if (parts.length === 5) {
      return `CON ${t(lang, "enter_amount")}`;
    }

    const amount = Number(parts[5]);
    if (!isValidAmount(amount)) return `CON ${t(lang, "enter_amount")}\n${t(lang, "invalid_amount")}`;

    // Get parent's balance
    const parentBalance = await getBalance(family.parent_phone);
    const remainingPool = await getRemainingPool(mCode);

    const cfg = tierConfig(merchant);
    let effectiveAcceptancePct = cfg.acceptCeiling;
    let nxRedeem = Math.min(parentBalance, amount * effectiveAcceptancePct, remainingPool);
    nxRedeem = floorToFive(nxRedeem);

    const cashPaid = amount - nxRedeem;
    const txnCode = "FAM" + Math.random().toString(36).substring(7).toUpperCase();

    if (parts.length === 6) {
      return `CON ${t(lang, "confirm_family_pay", {
        amount: String(amount),
        shop: merchant.name,
        code: familyCode,
        bal: String(parentBalance),
        red: String(nxRedeem),
        cash: String(cashPaid)
      })}`;
    }

    if (parts.length === 7) {
      const confirmChoice = parts[6];
      if (confirmChoice !== "1") return `END ${t(lang, "cancelled")}`;

      const { error } = await supabase.from("transactions").insert({
        merchant_code: mCode,
        merchant_phone: merchant.phone,
        customer_phone: phoneNumber, // the user who pays
        family_code: familyCode, // tags with family code
        amount,
        nx_redeemed: nxRedeem,
        nx_earned: 0,
        nx_fee: parentBalance > 0 ? 2 : 0,
        cash_paid: cashPaid,
        status: "awaiting_merchant",
        transaction_code: txnCode
      });

      if (error) return `END ${t(lang, "tx_failed")}`;
      return `END ${t(lang, "customer_req_sent", { txn: txnCode })}`;
    }
  }

  if (option === "2") {
    // Create Family Account
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

  if (option === "3") {
    // View Family Info
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

  return `END ${t(lang, "invalid_option")}`;
}

async function handlePayWithNX(phoneNumber: string, lang: string, parts: string[], user: any) {
  // 3 -> 1 -> MerchantCode -> Amount -> Confirm
  if (parts.length === 2) {
    return `CON ${t(lang, "enter_merchant_code")}`;
  }

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

    // Perform real-time calculation
    const [merchant, balance, remainingPool, totalPool] = await Promise.all([
      supabase.from("users").select("name, phone, franchise_tier, merchant_code").eq("merchant_code", mCode).maybeSingle(),
      getBalance(phoneNumber),
      getRemainingPool(mCode),
      getPool(mCode)
    ]);

    if (!merchant.data) return `END ${t(lang, "invalid_merchant_code")}`;
    const m = merchant.data;

    // Security Check
    const limits = await checkSecurityLimits(mCode, phoneNumber, m.franchise_tier);
    if (!limits.ok) return `END ${limits.reason}`;

    // Dynamic Throttling Logic
    const utilization = totalPool > 0 ? (1 - (remainingPool / totalPool)) : 1;
    let earnMultiplier = 1.0;
    if (utilization >= 0.9) earnMultiplier = 0;
    else if (utilization >= 0.7) earnMultiplier = 0.25;
    else if (utilization >= 0.4) earnMultiplier = 0.5;

    const cfg = tierConfig(m);
    let effectiveAcceptancePct = cfg.acceptCeiling;
    if (utilization >= 0.9) effectiveAcceptancePct = 0;
    else if (utilization >= 0.7) effectiveAcceptancePct = Math.min(0.10, cfg.acceptCeiling);
    else if (utilization >= 0.4) effectiveAcceptancePct = Math.min(0.20, cfg.acceptCeiling);
    
    // Total liability partition: Total NX (Redeem + Reward) must fit in remainingPool
    let nxRedeem = Math.min(balance, amount * effectiveAcceptancePct, remainingPool);
    nxRedeem = floorToFive(nxRedeem);
    
    const cashPaid = amount - nxRedeem;
    const earnRate = user.is_first_purchase_used ? 0.05 : 0.10;
    let nxEarned = Math.floor(cashPaid * earnRate * earnMultiplier);

    // Final Partition Check: If (Redeem + Earned) > Pool, trim Earned first
    const totalImpact = nxRedeem + nxEarned;
    if (totalImpact > remainingPool) {
        nxEarned = Math.max(0, remainingPool - nxRedeem);
    }
    
    const nxFee = balance > 0 ? 2 : 0;
    const txnCode = "NX" + Math.random().toString(36).substring(7).toUpperCase();

    // Store in params for confirmation screen
    return `CON ${t(lang, "customer_confirm_pay", {
      shop: m.name,
      code: m.merchant_code,
      phone: phoneNumber,
      amount: amount,
      cash: amount - nxRedeem,
      nx: nxRedeem,
      earn: nxEarned,
      rate: (earnRate * earnMultiplier * 100).toFixed(0),
      fee: nxFee,
      txn: txnCode
    })}`;
  }

  if (parts.length === 5) {
    const confirmChoice = parts[4];
    if (confirmChoice !== "1") return `END ${t(lang, "cancelled")}`;

    const mCode = parts[2].trim().toUpperCase();
    const amount = Number(parts[3]);
    
    const [merchant, balance, remainingPool, totalPool] = await Promise.all([
        supabase.from("users").select("name, phone, franchise_tier, merchant_code").eq("merchant_code", mCode).maybeSingle(),
        getBalance(phoneNumber),
        getRemainingPool(mCode),
        getPool(mCode)
    ]);
    const m = merchant.data;
    if (!m) return `END ${t(lang, "invalid_merchant_code")}`;

    // Re-verify security for final submission
    const limits = await checkSecurityLimits(mCode, phoneNumber, m.franchise_tier);
    if (!limits.ok) return `END ${limits.reason}`;
    const utilization = totalPool > 0 ? (1 - (remainingPool / totalPool)) : 1;
    let earnMultiplier = 1.0;
    if (utilization >= 0.9) earnMultiplier = 0;
    else if (utilization >= 0.7) earnMultiplier = 0.25;
    else if (utilization >= 0.4) earnMultiplier = 0.5;

    const cfg = tierConfig(m);
    let effectiveAcceptancePct = cfg.acceptCeiling;
    if (utilization >= 0.9) effectiveAcceptancePct = 0;
    else if (utilization >= 0.7) effectiveAcceptancePct = Math.min(0.10, cfg.acceptCeiling);
    else if (utilization >= 0.4) effectiveAcceptancePct = Math.min(0.20, cfg.acceptCeiling);

    let nxRedeem = Math.min(balance, amount * effectiveAcceptancePct, remainingPool);
    nxRedeem = floorToFive(nxRedeem);
    
    const nxFee = balance > 0 ? 2 : 0;
    const earnRate = user.is_first_purchase_used ? 0.05 : 0.10;
    let nxEarned = Math.floor((amount - nxRedeem) * earnRate * earnMultiplier);

    // Enforce total impact limit
    if (nxRedeem + nxEarned > remainingPool) {
        nxEarned = Math.max(0, remainingPool - nxRedeem);
    }

    const txnCode = "NX" + Math.random().toString(36).substring(7).toUpperCase();

    const { data: txn, error } = await supabase.from("transactions").insert({
        merchant_code: mCode,
        merchant_phone: m.phone,
        customer_phone: phoneNumber,
        amount,
        nx_redeemed: nxRedeem,
        nx_earned: nxEarned,
        nx_fee: nxFee,
        cash_paid: amount - nxRedeem,
        status: "awaiting_merchant",
        transaction_code: txnCode
    }).select().single();

    if (error) return `END ${t(lang, "tx_failed")}`;
    
    return `END ${t(lang, "customer_req_sent", { txn: txnCode })}`;
  }

  return `END ${t(lang, "invalid_option")}`;
}
