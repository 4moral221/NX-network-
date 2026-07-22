import { TIER_CONFIG, MIN_DENOMINATION, SKU_VARIANTS, T, SKU } from "./config";
import { supabase } from "./db";
import crypto from "crypto";

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
    .replace(/\s+/g, "")
    .replace("litres", "L").replace("litre", "L")
    .replace("liter", "L").replace("liters", "L")
    .replace(/(\d)l$/, "$1L")
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
  for (const [k, v] of Object.entries(params)) {
    str = str.replaceAll(`{${k}}`, String(v));
  }
  return str;
}

export function roundDown(n: number): number {
  return Math.floor(n);
}

export function startOfCycle(): string {
  const d = new Date();
  d.setDate(1); d.setHours(0, 0, 0, 0);
  return d.toISOString();
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

export async function hashPin(pin: string, phone: string): Promise<string> {
  return crypto.createHash("sha256").update(pin + phone).digest("hex");
}

export async function verifyPin(pin: string, hash: string | null | undefined, phone: string = ""): Promise<boolean> {
  if (!hash) return false;
  if (hash === pin) return true;

  try {
    const phoneWithPlus = phone.startsWith("+") ? phone : `+${phone}`;
    const phoneWithoutPlus = phone.replace(/^\+/, "");

    const shaWithPlus = crypto.createHash("sha256").update(pin + phoneWithPlus).digest("hex");
    if (hash === shaWithPlus) return true;

    const shaWithoutPlus = crypto.createHash("sha256").update(pin + phoneWithoutPlus).digest("hex");
    if (hash === shaWithoutPlus) return true;

    const shaAlone = crypto.createHash("sha256").update(pin).digest("hex");
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
  }
  return clean;
}

export function merchantMenuStr(user: any, lang: string): string {
  let menu = t(lang, "merchant_menu");
  menu += lang === "en" ? "\n4 Confirm Delivery" : "\n4 Thibitisha Mzigo";
  if (user?.franchise_tier === "HUB") {
    menu += `\n5 My Hub`;
  }
  return menu;
}
