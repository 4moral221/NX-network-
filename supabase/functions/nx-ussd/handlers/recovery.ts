import { supabase, getBalance } from "../db.ts";
import { t, hashPin, verifyPin } from "../utils.ts";
import { RESTOCK_PHONE } from "../config.ts";

export async function handleRecovery(phoneNumber: string, lang: string, parts: string[]) {
  if (parts.length === 1) return `CON ${t(lang, "recover_menu")}`;
  if (parts.length === 2) return `CON Enter National ID:`;
  if (parts.length === 3) return `CON Enter your current PIN:`;
  if (parts.length === 4) {
    const oldPhone = parts[1].trim();
    const nid = parts[2].trim().toUpperCase();
    const { data: oldUser } = await supabase.from("users").select("*").eq("phone", oldPhone).maybeSingle();
    if (!oldUser) return `END Phone number not found.`;
    if (oldUser.national_id !== nid) return `END Recovery failed. ID incorrect.`;
    await supabase.from("users").update({ status: "recovered", recovered_to: phoneNumber }).eq("phone", oldPhone);
    return `END ${t(lang, "recover_success_detail", { code: oldUser.merchant_code || "N/A" })}`;
  }
  return `CON ${t(lang, "recover_menu")}`;
}
