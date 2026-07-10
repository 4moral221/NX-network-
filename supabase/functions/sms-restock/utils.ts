const atUsername = Deno.env.get("AT_USERNAME")!;
const atApiKey   = Deno.env.get("AT_API_KEY")!;
const atSandbox  = Deno.env.get("AT_SANDBOX") === "true";

const AT_SMS_URL = atSandbox
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

export function normalisePhone(raw: string): string {
  let p = raw.trim().replace(/\s+/g, "");
  if (p.startsWith("0"))    p = "+254" + p.slice(1);
  if (p.startsWith("254")) p = "+" + p;
  if (!p.startsWith("+"))  p = "+254" + p;
  return p;
}

export async function sendSms(to: string, message: string): Promise<void> {
  try {
    const res = await fetch(AT_SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept":       "application/json",
        "apiKey":       atApiKey,
      },
      body: new URLSearchParams({ username: atUsername, to, message, from: "6180" }).toString(),
    });
    if (!res.ok) console.error("AT SMS send failed:", await res.text());
  } catch (e) {
    console.error("sendSms exception:", e);
  }
}

const SKU_MAP: Record<string, string> = {
  BR: "SupaLoaf",  BREAD: "SupaLoaf",  SUPA: "SupaLoaf",  LOAF: "SupaLoaf",
  ML: "Milk",      MILK: "Milk",       MAZIWA: "Milk",
  SG: "Sugar",     SUGAR: "Sugar",     SUKARI: "Sugar",
  CO: "CookingOil",OIL: "CookingOil", MAFUTA: "CookingOil", COOKING: "CookingOil",
  F:  "Flour",     FLOUR: "Flour",     PEMBE: "Flour",    MAIZE: "Flour",
};

export interface RestockItem { code: string; name: string; qty: number; }
export interface RestockVariant { code: string; name: string; variant: string | null; qty: number; }
export interface ParseResult { items: RestockItem[]; variants: RestockVariant[]; errors: string[]; }

export function parseSmsOrder(text: string, _lang: string = "en"): ParseResult {
  const tokens = text.toUpperCase().split(/[,;\n]+/).map(t => t.trim()).filter(Boolean);
  const items: RestockItem[] = [];
  const variants: RestockVariant[] = [];
  const errors: string[] = [];

  for (const token of tokens) {
    // Strict: CODE*QTY or CODE QTY
    let match = token.match(/^([A-Z]+)\*(\d+)$/) || token.match(/^([A-Z]+)\s+(\d+)$/);
    if (match) {
      const qty = parseInt(match[2], 10);
      if (isNaN(qty) || qty <= 0 || qty > 9999) { errors.push(token); continue; }
      const name = SKU_MAP[match[1]];
      if (!name) { errors.push(token); continue; }
      const ex = items.find(i => i.code === match![1]);
      if (ex) ex.qty += qty; else items.push({ code: match[1], name, qty });
      continue;
    }

    // Variant: NAME/CODE VARIANT*QTY e.g. "pembe 2kg*10"
    match = token.match(/^([A-Z][A-Z\s]*)\s+([A-Z0-9]+)\*(\d+)$/);
    if (match) {
      const nameOrCode = match[1].trim();
      const variant    = match[2];
      const qty        = parseInt(match[3], 10);
      if (isNaN(qty) || qty <= 0 || qty > 9999) { errors.push(token); continue; }
      let code: string | null = null, name: string | null = null;
      if (SKU_MAP[nameOrCode]) { code = nameOrCode; name = SKU_MAP[nameOrCode]; }
      else {
        const f = Object.entries(SKU_MAP).find(([k, v]) =>
          v.toUpperCase().includes(nameOrCode) || nameOrCode.includes(v.toUpperCase()) || k === nameOrCode);
        if (f) { code = f[0]; name = f[1]; }
      }
      if (!code || !name) { errors.push(token); continue; }
      variants.push({ code, name, variant, qty });
      const ex = items.find(i => i.code === code);
      if (ex) ex.qty += qty; else items.push({ code, name, qty });
      continue;
    }

    // Bare name or code — qty=1
    const bare = token.match(/^([A-Z][A-Z\s]*)$/);
    if (bare) {
      const nameOrCode = bare[1].trim();
      let code: string | null = null, name: string | null = null;
      if (SKU_MAP[nameOrCode]) { code = nameOrCode; name = SKU_MAP[nameOrCode]; }
      else {
        const f = Object.entries(SKU_MAP).find(([k, v]) =>
          v.toUpperCase() === nameOrCode || nameOrCode.includes(v.toUpperCase()));
        if (f) { code = f[0]; name = f[1]; }
      }
      if (code && name) {
        const ex = items.find(i => i.code === code);
        if (ex) ex.qty += 1; else items.push({ code, name, qty: 1 });
      } else errors.push(token);
      continue;
    }

    errors.push(token);
  }

  return { items, variants, errors };
}
