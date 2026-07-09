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
  const { data, error } = await supabase.rpc("hash_password", { password: pin });
  if (error || !data) throw error || new Error("Failed to hash pin");
  return data;
}

export function merchantMenuStr(user: any, lang: string): string {
  let menu = t(lang, "merchant_menu");
  if (user?.franchise_tier === "HUB") {
    menu += `\n5 My Hub`;
  }
  return menu;
}
