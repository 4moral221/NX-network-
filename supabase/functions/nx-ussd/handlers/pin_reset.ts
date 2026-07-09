import { supabase } from "../db.ts";
import { t, hashPin } from "../utils.ts";

async function isHighRisk(phoneNumber: string): Promise<boolean> {
  // 1. Fetch User Data
  const { data: user } = await supabase.from("users").select("created_at, nx_balance").eq("phone", phoneNumber).single();
  if (!user) return true;

  // 2. Age Check (< 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (new Date(user.created_at) > thirtyDaysAgo) return true;

  // 3. Balance Check (> 5000 NX)
  if (Number(user.nx_balance) > 5000) return true;

  // 4. Temporal Check (01:00 – 04:00 EAT)
  const now = new Date();
  const eatHour = now.getUTCHours() + 3; // Rough approximation
  if (eatHour >= 1 && eatHour < 4) return true;

  // 5. Failed Attempt Velocity
  const oneHourAgo = new Date(Date.now() - 60 * 60000).toISOString();
  const { count } = await supabase
    .from("nx_logs")
    .select("*", { count: 'exact', head: true })
    .eq("phone", phoneNumber)
    .eq("context", "PIN_RESET_FAILED")
    .gte("created_at", oneHourAgo);
  
  if ((count || 0) > 3) return true;

  return false;
}

export async function handlePinReset(phoneNumber: string, lang: string, parts: string[]) {
  // If high risk, block immediately
  if (parts.length === 1) {
      if (await isHighRisk(phoneNumber)) {
        await supabase.from("nx_logs").insert({ phone: phoneNumber, context: "PIN_RESET_BLOCKED", error: "High Risk" });
        return `END ${t(lang, "pin_reset_failed")} - Manual verification required.`;
      }
      return `CON ${t(lang, "new_pin")}`;
  }
  
  // Logic after skipping OTP
  if (parts.length === 2) { // New PIN
     return `CON ${t(lang, "confirm_pin")}`;
  }

  if (parts.length === 3) { // Confirm PIN
     const newPin = parts[1].trim(); // Adjusted indexing
     const confirmPin = parts[2].trim();
     
     if (newPin !== confirmPin) {
        await supabase.from("nx_logs").insert({ phone: phoneNumber, context: "PIN_RESET_FAILED" });
        return `END ${t(lang, "pin_reset_failed")}: Pin mismatch.`;
     }
     
     const pinHash = await hashPin(newPin, phoneNumber);
     const { error } = await supabase.from("users").update({ recovery_pin: pinHash, recovery_otp: null }).eq("phone", phoneNumber);
     
     if (error) return `END ${t(lang, "pin_reset_failed")}`;
     return `END ${t(lang, "pin_reset_success")}`;
  }
  
  return `CON ${t(lang, "new_pin")}`;
}
