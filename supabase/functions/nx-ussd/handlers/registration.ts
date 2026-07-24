import { supabase } from "../db.ts";
import { t, isValidNationalId, isValidPin, hashPin } from "../utils.ts";

export async function handleRegistration(phoneNumber: string, lang: string, parts: string[]) {
  if (parts.length === 1) return `CON ${t(lang, "register_as")}`;
  const roleChoice = parts[1];
  if (roleChoice === "1") return await handleCustomerRegistration(phoneNumber, lang, parts);
  if (roleChoice === "2") return await handleMerchantRegistration(phoneNumber, lang, parts);
  return `END ${t(lang, "reg_failed")}`;
}

async function handleCustomerRegistration(phoneNumber: string, lang: string, parts: string[]) {
  if (parts.length === 2) return `CON ${t(lang, "terms")}`;
  if (parts.length === 3) { if (parts[2] !== "1") return `END ${t(lang, "must_accept")}`; return `CON ${t(lang, "enter_name")}`; }
  if (parts.length === 4) { if (!parts[3].trim()) return `CON ${t(lang, "enter_name")}\n${t(lang, "name_empty")}`; return `CON ${t(lang, "enter_national_id")}`; }
  if (parts.length === 5) {
    const nid = parts[4].trim().toUpperCase();
    if (!isValidNationalId(nid)) return `CON ${t(lang, "enter_national_id")}\nInvalid ID`;
    const { data: exist } = await supabase.from("users").select("id").eq("national_id", nid).maybeSingle();
    if (exist) return `END ID already registered.`;
    return `CON ${t(lang, "set_pin")}`;
  }
  if (parts.length === 6) {
    const pin = parts[5].trim();
    if (!isValidPin(pin)) return `CON ${t(lang, "set_pin")}\nInvalid PIN`;
    const hashedPin = await hashPin(pin, phoneNumber);
    const { error } = await supabase.from("users").insert({ phone: phoneNumber, name: parts[3].trim(), national_id: parts[4].trim().toUpperCase(), recovery_pin: hashedPin, role: "customer", status: "active", language: lang, franchise_tier: null, acceptance_percent: null });
    if (error) return `END ${t(lang, "reg_failed")}`;
    return `END ${t(lang, "welcome_customer", { name: parts[3].trim() })}`;
  }
  return `END ${t(lang, "reg_failed")}`;
}

async function handleMerchantRegistration(phoneNumber: string, lang: string, parts: string[]) {
  if (parts.length === 2) return `CON ${t(lang, "enter_biz_name")}`;
  if (parts.length === 3) { if (!parts[2].trim()) return `CON ${t(lang, "enter_biz_name")}\n${t(lang, "all_fields_required")}`; return `CON ${t(lang, "enter_location")}`; }
  if (parts.length === 4) { if (!parts[3].trim()) return `CON ${t(lang, "enter_location")}\n${t(lang, "all_fields_required")}`; return `CON ${t(lang, "enter_national_id")}`; }
  if (parts.length === 5) {
    const nid = parts[4].trim().toUpperCase();
    if (!isValidNationalId(nid)) return `CON ${t(lang, "enter_national_id")}\nInvalid ID`;
    return `CON ${t(lang, "set_pin")}`;
  }
  if (parts.length === 6) {
    const pin = parts[5].trim();
    if (!isValidPin(pin)) return `CON ${t(lang, "set_pin")}\nInvalid PIN`;
    const hashedPin = await hashPin(pin, phoneNumber);
    const { data: white } = await supabase.from("merchant_whitelist").select("*").eq("phone", phoneNumber).maybeSingle();
    if (white) {
      const mCode = await generateMerchantCode();
      const { error } = await supabase.from("users").insert({ phone: phoneNumber, name: parts[2].trim(), role: "merchant", merchant_code: mCode, location: parts[3].trim(), national_id: parts[4].trim().toUpperCase(), recovery_pin: hashedPin, franchise_tier: white.tier || "BASIC", hub_merchant_code: white.hub_merchant_code || null, status: "active", language: lang });
      if (error) return `END ${t(lang, "reg_failed")}`;
      await supabase.from("merchant_margins").insert({ merchant_code: mCode, gross_margin: 0 });
      return `END Registered! Code: ${mCode}. Karibu NX!`;
    } else {
      const { error } = await supabase.from("merchant_applications").insert({ phone: phoneNumber, business_name: parts[2].trim(), location: parts[3].trim(), national_id: parts[4].trim().toUpperCase(), recovery_pin: hashedPin, status: "pending" });
      if (error) return `END Application failed.`;
      return `END Application submitted. We'll contact you soon.`;
    }
  }
  return `END ${t(lang, "reg_failed")}`;
}

async function generateMerchantCode(): Promise<string> {
  const code = "M" + Math.floor(100000 + Math.random() * 900000).toString();
  const { data } = await supabase.from("users").select("id").eq("merchant_code", code).maybeSingle();
  if (data) return generateMerchantCode();
  return code;
}
