import { TIER_CONFIG, MIN_DENOMINATION, SKU_VARIANTS, T, SKU } from "./config.ts";
import { supabase } from "./db.ts";

export function tierConfig(user: any) {
  return TIER_CONFIG[user?.franchise_tier ?? "BASIC"] ?? TIER_CONFIG["BASIC"];
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && Number.isInteger(amount) && amount % MIN_DENOMINATION === 0;
}

export function floorToFive(n: number): number {
  return Math.floor(n / MIN_DENOMINATION) * MIN_DENOMINATION;
}

export function normaliseVariant(raw: string | null, skuCode: string): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase()
    .replace(/\s+/g, "").replace("litres", "L").replace("litre", "L")
    .replace("liter", "L").replace("liters", "L").replace(/(\d)l$/, "$1L")
    .replace("grams", "g").replace("gram", "g")
    .replace("kilograms", "kg").replace("kilogram", "kg")
    .replace("milliliters", "ml").replace("millilitres", "ml").replace("millilitre", "ml");
  const known = SKU_VARIANTS[skuCode] ?? [];
  const exact = known.find(k => k.toLowerCase() === v);
  if (exact) return exact;
  const prefix = known.find(k => k.toLowerCase().startsWith(v) || v.startsWith(k.toLowerCase()));
  if (prefix) return prefix;
  return v || null;
}

export function skuName(lang: string, code: string): string {
  return (SKU as any)[lang === "en" ? "en" : "sw"][code] || code;
}

export function t(lang: string, key: string, params: Record<string, any> = {}): string {
  let str = T[key]?.[lang] || T[key]?.["en"] || key;
  for (const [k, v] of Object.entries(params)) str = str.replaceAll(`{${k}}`, String(v));
  return str;
}

export function roundDown(n: number): number { return Math.floor(n); }

export function startOfCycle(): string {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export function isValidNationalId(id: string): boolean {
  const cleaned = id.trim().toUpperCase();
  if (/^\d{7,9}$/.test(cleaned)) return true;
  if (/^[A-Z]{1,2}\d{6,9}$/.test(cleaned)) return true;
  if (/^[A-Z0-9]{6,9}$/.test(cleaned)) return true;
  return false;
}

export function isValidPin(pin: string): boolean {
  return pin.length === 4 && /^\d+$/.test(pin);
}

export async function hashPin(pin: string, _phone: string): Promise<string> {
  const { data, error } = await supabase.rpc("hash_password", { password: pin });
  if (error || !data) throw error || new Error("Failed to hash pin");
  return data;
}

export async function verifyPin(pin: string, hash: string | null | undefined, phone: string = ""): Promise<boolean> {
  if (!hash) return false;
  if (hash === pin) return true;

  try {
    const phoneWithPlus = phone.startsWith("+") ? phone : `+${phone}`;
    const phoneWithoutPlus = phone.replace(/^\+/, "");

    const msgWithPlus = new TextEncoder().encode(pin + phoneWithPlus);
    const bufWithPlus = await crypto.subtle.digest("SHA-256", msgWithPlus);
    const shaWithPlus = Array.from(new Uint8Array(bufWithPlus)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash === shaWithPlus) return true;

    const msgWithoutPlus = new TextEncoder().encode(pin + phoneWithoutPlus);
    const bufWithoutPlus = await crypto.subtle.digest("SHA-256", msgWithoutPlus);
    const shaWithoutPlus = Array.from(new Uint8Array(bufWithoutPlus)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash === shaWithoutPlus) return true;

    const msgUint8Alone = new TextEncoder().encode(pin);
    const hashBufferAlone = await crypto.subtle.digest("SHA-256", msgUint8Alone);
    const shaAlone = Array.from(new Uint8Array(hashBufferAlone)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash === shaAlone) return true;
  } catch (e) {
    // Ignore hashing error
  }

  try {
    const { data, error } = await supabase.rpc("verify_password", { password: pin, hash });
    if (!error && data === true) return true;
  } catch (e) {
    // Ignore bcrypt salt format mismatch
  }

  return false;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.trim().replace(/\s+/g, '').replace(/[-()]/g, '');
  if (clean.startsWith('0')) {
    clean = '+254' + clean.slice(1);
  } else if (/^[17]\d{8}$/.test(clean)) {
    clean = '+254' + clean;
  } else if (clean.startsWith('254') && !clean.startsWith('+')) {
    clean = '+' + clean;
  } else if (!clean.startsWith('+') && clean.length > 0) {
    clean = '+' + clean;
  }
  return clean;
}

export function merchantMenuStr(user: any, lang: string): string {
  let menu = t(lang, "merchant_menu");
  if (user?.franchise_tier === "HUB") menu += `\n5 My Hub`;
  return menu;
}
