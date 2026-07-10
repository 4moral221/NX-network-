import { supabase } from "../db.ts";
import { t, hashPin, isValidPin } from "../utils.ts";

const atUsername = Deno.env.get("AT_USERNAME")!;
const atApiKey   = Deno.env.get("AT_API_KEY")!;
const atSandbox  = Deno.env.get("AT_SANDBOX") === "true";
const AT_SMS_URL = atSandbox
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

function generateOTP(length: number = 6): string {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, "0");
}

async function sendOtpSms(phone: string, otp: string) {
  await fetch(AT_SMS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json", "apiKey": atApiKey },
    body: new URLSearchParams({ username: atUsername, to: phone, message: `NX PIN Reset Code: ${otp}. Valid 10 min. Do not share.`, from: "6180" }).toString(),
  });
}

async function isHighRisk(phoneNumber: string): Promise<boolean> {
  const { data: user } = await supabase.from("users").select("created_at, nx_balance").eq("phone", phoneNumber).single();
  if (!user) return true;
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (new Date(user.created_at) > thirtyDaysAgo) return true;
  if (Number(user.nx_balance) > 5000) return true;
  const now = new Date(); const eatHour = now.getUTCHours() + 3;
  if (eatHour >= 1 && eatHour < 4) return true;
  const oneHourAgo = new Date(Date.now() - 60 * 60000).toISOString();
  const { count } = await supabase.from("nx_logs").select("*", { count: 'exact', head: true }).eq("phone", phoneNumber).eq("context", "PIN_RESET_FAILED").gte("created_at", oneHourAgo);
  if ((count || 0) > 3) return true;
  return false;
}

export async function handlePinReset(phoneNumber: string, lang: string, parts: string[]) {
  if (parts.length === 1) {
    if (await isHighRisk(phoneNumber)) return `END ${t(lang, "pin_reset_failed")} - Manual verification required.`;
    const otp = generateOTP(6);
    await supabase.from("admin_otp_sessions").upsert({ phone: phoneNumber, otp, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), verified: false }, { onConflict: "phone" });
    try { await sendOtpSms(phoneNumber, otp); } catch { return `END ${t(lang, "otp_send_failed")}`; }
    return `CON ${t(lang, "enter_pin_reset_otp")}`;
  }
  if (parts.length === 2) {
    const { data: session } = await supabase.from("admin_otp_sessions").select("*").eq("phone", phoneNumber).maybeSingle();
    if (!session || new Date() > new Date(session.expires_at) || session.otp !== parts[1].trim()) {
      await supabase.from("nx_logs").insert({ phone: phoneNumber, context: "PIN_RESET_FAILED", message: "OTP invalid or expired" });
      return `END ${t(lang, "otp_invalid_or_expired")}`;
    }
    await supabase.from("admin_otp_sessions").update({ verified: true }).eq("phone", phoneNumber);
    return `CON ${t(lang, "new_pin")}`;
  }
  if (parts.length === 3) {
    if (!isValidPin(parts[2].trim())) return `CON ${t(lang, "new_pin")}\nInvalid PIN`;
    return `CON ${t(lang, "confirm_pin")}`;
  }
  if (parts.length === 4) {
    if (parts[2].trim() !== parts[3].trim()) return `END ${t(lang, "pin_reset_failed")}: PIN mismatch.`;
    const { data: session } = await supabase.from("admin_otp_sessions").select("verified, expires_at").eq("phone", phoneNumber).maybeSingle();
    if (!session?.verified || new Date() > new Date(session.expires_at)) return `END ${t(lang, "otp_invalid_or_expired")}`;
    const pinHash = await hashPin(parts[2].trim(), phoneNumber);
    const { error } = await supabase.from("users").update({ recovery_pin: pinHash }).eq("phone", phoneNumber);
    if (error) return `END ${t(lang, "pin_reset_failed")}`;
    await supabase.from("admin_otp_sessions").delete().eq("phone", phoneNumber);
    return `END ${t(lang, "pin_reset_success")}`;
  }
  return `CON ${t(lang, "new_pin")}`;
}
