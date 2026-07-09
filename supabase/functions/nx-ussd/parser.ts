// parser.ts — NX USSD order parser — strictly 5 core SKUs
// BR (Bread), ML (Milk), SG (Sugar), CO (Cooking Oil), F (Maize/Wheat Flour)

export const BRAND_TO_SKU: Map<string, string> = new Map([
  // ── Maize/Wheat Flour — F ──────────────────────────────
  ["UNGA",         "MF"], ["PEMBE",       "MF"], ["AJAB",        "MF"],
  ["JOGOO",        "MF"], ["DOLA",        "MF"], ["EXE",         "MF"],
  ["NDOVU",        "MF"], ["SOKO",        "MF"], ["FAMILA",      "MF"],
  ["DUMA",         "MF"], ["UGALI",       "MF"], ["HOSTESS",     "MF"],
  ["KABRAS",       "MF"], ["RHINO",       "MF"], ["FLOUR",       "MF"],
  ["MAIZE",        "MF"],

  // ── Bread — BR ────────────────────────────────────
  ["MKATE",        "BR"], ["BREAD",       "BR"], ["LOAF",        "BR"],
  ["BROADWAYS",    "BR"], ["FAMILY",      "BR"], ["KINGMIL",     "BR"],
  ["SUPALOAF",     "BR"], ["SUPA LOAF",    "BR"], ["FAHARI",      "BR"], ["UNITED",      "BR"],

  // ── Milk — ML ─────────────────────────────────────
  ["MAZIWA",       "ML"], ["MILK",        "ML"], ["FRESH",       "ML"],
  ["BROOKSIDE",    "ML"], ["FRESHA",      "ML"], ["MT KENYA",    "ML"],
  ["TUZO",         "ML"], ["KCC",         "ML"], ["ILARA",       "ML"],
  ["DAIMA",        "ML"], ["LALA",        "ML"], ["MAZIWA LALA", "ML"],

  // ── Sugar — SG ────────────────────────────────────
  ["SUKARI",       "SG"], ["SUGAR",       "SG"],
  ["MUMIAS",       "SG"], ["KIBOS",       "SG"],
  ["WEST KENYA",   "SG"], ["SONY",        "SG"],

  // ── Cooking Oil — CO ──────────────────────────────
  ["MAFUTA",       "CO"], ["OIL",         "CO"],
  ["ELIANTO",      "CO"], ["SALIT",       "CO"],
  ["RINA",         "CO"], ["GOLDEN FRY",  "CO"],
]);

const VARIANT_RE = /\b\d+(\.\d+)?\s*(kg|g|ml|l|litre|ltr|pkt|pcs|tray|packet|sack|bag)\b/gi;
const DIRECT_SKU = new Set(["BR","ML","SG","CO","F"]);

export function normalise(raw: string): string {
  return raw
    .replace(/\r\n/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitPath(text: string): string[] {
  return text.split("*").map((s) => s.trim());
}

export function currentInput(parts: string[]): string {
  return parts[parts.length - 1] ?? "";
}

export function extractSkuAndQty(raw: string): {
  keyword: string;
  qty: number;
  variantHint: string | null;
} {
  let s = normalise(raw);
  let qty = 1;

  const startQtyMatch = s.match(/^(\d+)[\sxX*]+/);
  if (startQtyMatch) {
    qty = parseInt(startQtyMatch[1], 10);
    s = s.slice(startQtyMatch[0].length).trim();
  } else {
    const endQtyMatch = s.match(/[*\sxX]+(\d+)\s*$/);
    if (endQtyMatch) {
      qty = parseInt(endQtyMatch[1], 10);
      s = s.slice(0, s.length - endQtyMatch[0].length).trim();
    }
  }

  // Separate letter-number combinations
  s = s.replace(/([a-zA-Z])(\d)/g, "$1 $2");

  VARIANT_RE.lastIndex = 0;
  const variantMatch = s.match(VARIANT_RE);
  const variantHint = variantMatch
    ? variantMatch[0].replace(/\s+/g, "").toLowerCase()
    : null;

  VARIANT_RE.lastIndex = 0;
  s = s.replace(VARIANT_RE, "").replace(/\s+/g, " ").trim();

  return { keyword: s.toUpperCase(), qty, variantHint };
}

export function resolveToSKU(keyword: string): string | null {
  const k = keyword.trim().toUpperCase();
  if (DIRECT_SKU.has(k)) return k;
  if (BRAND_TO_SKU.has(k)) return BRAND_TO_SKU.get(k)!;

  for (const [brand, sku] of BRAND_TO_SKU) {
    if (k.includes(brand)) return sku;
    
    const words = brand.split(" ");
    if (words.length > 1) {
      const allPresent = words.every((w) =>
        new RegExp(`\\b${w}\\b`, "i").test(k)
      );
      if (allPresent) return sku;
    }
  }

  return null;
}

export interface OrderLine {
  raw: string;
  keyword: string;
  qty: number;
  variantHint: string | null;
  skuCode: string | null;
  needsVectorMatch: boolean;
}

export function parseOrderLine(raw: string): OrderLine {
  const { keyword, qty, variantHint } = extractSkuAndQty(raw);
  const skuCode = resolveToSKU(keyword);
  return {
    raw: normalise(raw),
    keyword,
    qty,
    variantHint,
    skuCode,
    needsVectorMatch: skuCode === null,
  };
}

export function parseMultiOrder(raw: string): OrderLine[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(parseOrderLine);
}
