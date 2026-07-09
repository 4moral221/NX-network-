import { supabase } from "../db.ts";
import { t, isValidNationalId, isValidPin, hashPin } from "../utils.ts";

export async function handleRegistration(phoneNumber: string, lang: string, parts: string[]) {
  // parts[0] is always "1"
  if (parts.length === 1) {
    return `CON ${t(lang, "register_as")}`;
  }

  const roleChoice = parts[1];
  
  if (roleChoice === "1") { // CUSTOMER
    return await handleCustomerRegistration(phoneNumber, lang, parts);
  } else if (roleChoice === "2") { // MERCHANT
    return await handleMerchantRegistration(phoneNumber, lang, parts);
  }

  return `END ${t(lang, "invalid_option")}`;
}

async function handleCustomerRegistration(phoneNumber: string, lang: string, parts: string[]) {
  // 1A. Customer flow: 1 (Reg) -> 1 (Cust) -> 3 (Terms) -> 4 (Name) -> 5 (ID) -> 6 (PIN)
  if (parts.length === 2) {
    return `CON ${t(lang, "terms")}`;
  }
  if (parts.length === 3) {
    if (parts[2] !== "1") return `END ${t(lang, "must_accept")}`;
    return `CON ${t(lang, "enter_name")}`;
  }
  if (parts.length === 4) {
    if (!parts[3].trim()) return `CON ${t(lang, "enter_name")}\n${t(lang, "name_empty")}`;
    return `CON ${t(lang, "enter_national_id")}`;
  }
  if (parts.length === 5) {
    const nid = parts[4].trim().toUpperCase();
    if (!isValidNationalId(nid)) return `CON ${t(lang, "enter_national_id")}\n${t(lang, "invalid_national_id")}`;
    
    // Check if ID already exists
    const { data: exist } = await supabase.from("users").select("id").eq("national_id", nid).maybeSingle();
    if (exist) return `END ${t(lang, "id_exists")}`;
    
    return `CON ${t(lang, "set_pin")}`;
  }
  if (parts.length === 6) {
    const pin = parts[5].trim();
    if (!isValidPin(pin)) return `CON ${t(lang, "set_pin")}\n${t(lang, "invalid_pin")}`;

    const name = parts[3].trim();
    const nid = parts[4].trim().toUpperCase();
    const hashedPin = await hashPin(pin, phoneNumber);

    const { error } = await supabase.from("users").insert({
      phone: phoneNumber,
      name,
      national_id: nid,
      recovery_pin: hashedPin,
      role: "customer",
      status: "active",
      language: lang
    });

    if (error) return `END ${t(lang, "reg_failed")}`;
    return `END ${t(lang, "welcome_customer", { name })}`;
  }
  return `END ${t(lang, "invalid_option")}`;
}

async function handleMerchantRegistration(phoneNumber: string, lang: string, parts: string[]) {
  // 1B. Merchant flow: 1 (Reg) -> 2 (Merch) -> 3 (Biz Name) -> 4 (Location) -> 5 (ID) -> 6 (PIN)
  if (parts.length === 2) {
    return `CON ${t(lang, "enter_biz_name")}`;
  }
  if (parts.length === 3) {
    if (!parts[2].trim()) return `CON ${t(lang, "enter_biz_name")}\n${t(lang, "all_fields_required")}`;
    return `CON ${t(lang, "enter_location")}`;
  }
  if (parts.length === 4) {
    if (!parts[3].trim()) return `CON ${t(lang, "enter_location")}\n${t(lang, "all_fields_required")}`;
    return `CON ${t(lang, "enter_national_id")}`;
  }
  if (parts.length === 5) {
    const nid = parts[4].trim().toUpperCase();
    if (!isValidNationalId(nid)) return `CON ${t(lang, "enter_national_id")}\n${t(lang, "invalid_national_id")}`;
    return `CON ${t(lang, "set_pin")}`;
  }
  if (parts.length === 6) {
    const pin = parts[5].trim();
    if (!isValidPin(pin)) return `CON ${t(lang, "set_pin")}\n${t(lang, "invalid_pin")}`;

    const bizName = parts[2].trim();
    const location = parts[3].trim();
    const nid = parts[4].trim().toUpperCase();
    const hashedPin = await hashPin(pin, phoneNumber);

    // Check Whitelist
    const { data: white } = await supabase.from("merchant_whitelist")
      .select("*")
      .eq("phone", phoneNumber)
      .maybeSingle();

    if (white) {
      // Auto-approve whitelisted merchant
      const mCode = await generateMerchantCode();
      const { error } = await supabase.from("users").insert({
        phone: phoneNumber,
        name: bizName,
        role: "merchant",
        merchant_code: mCode,
        location,
        national_id: nid,
        recovery_pin: hashedPin,
        franchise_tier: white.tier || "BASIC",
        hub_merchant_code: white.hub_merchant_code || null,
        status: "active",
        language: lang
      });

      if (error) return `END ${t(lang, "reg_failed")}`;
      
      // Auto-create margin row
      await supabase.from("merchant_margins").insert({ merchant_code: mCode, gross_margin: 0 });

      return `END Welcome Registered! Code: ${mCode}\nPin imewekwa. Karibu NX!`;
    } else {
      // Create Application
      const { error } = await supabase.from("merchant_applications").insert({
        phone: phoneNumber,
        business_name: bizName,
        location,
        national_id: nid,
        recovery_pin: hashedPin,
        status: "pending"
      });

      if (error) return `END ${t(lang, "app_failed")}`;
      return `END ${t(lang, "app_submitted", { phone: "+254700000000" })}`;
    }
  }
  return `END ${t(lang, "invalid_option")}`;
}

async function generateMerchantCode(): Promise<string> {
  const code = "M" + Math.floor(100000 + Math.random() * 900000).toString();
  const { data } = await supabase.from("users").select("id").eq("merchant_code", code).maybeSingle();
  if (data) return generateMerchantCode();
  return code;
}
