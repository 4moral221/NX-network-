// ============================================================
// NX Network — Basket parser
// Handles: NAME VARIANT@PRICE*QTY
// Examples:
//   pembe 2kg@120*2   → Flour, 2kg, KES 120, qty 2
//   BR@15*3           → Bread, KES 15, qty 3
//   ML 500ml@60       → Milk 500ml, KES 60, qty 1
//   SG*2              → Sugar, qty 2, no price
//   pembe 2kg         → Flour, 2kg, qty 1, no price
// ============================================================

const SKU_MAP: Record<string, { code: string; name: string }> = {
  BR:      { code: 'BR', name: 'SupaLoaf' },
  BREAD:   { code: 'BR', name: 'SupaLoaf' },
  SUPA:    { code: 'BR', name: 'SupaLoaf' },
  LOAF:    { code: 'BR', name: 'SupaLoaf' },
  ML:      { code: 'ML', name: 'Milk' },
  MILK:    { code: 'ML', name: 'Milk' },
  MAZIWA:  { code: 'ML', name: 'Milk' },
  SG:      { code: 'SG', name: 'Sugar' },
  SUGAR:   { code: 'SG', name: 'Sugar' },
  SUKARI:  { code: 'SG', name: 'Sugar' },
  CO:      { code: 'CO', name: 'CookingOil' },
  OIL:     { code: 'CO', name: 'CookingOil' },
  MAFUTA:  { code: 'CO', name: 'CookingOil' },
  COOKING: { code: 'CO', name: 'CookingOil' },
  F:       { code: 'F',  name: 'Flour' },
  FLOUR:   { code: 'F',  name: 'Flour' },
  PEMBE:   { code: 'F',  name: 'Flour' },
  MAIZE:   { code: 'F',  name: 'Flour' },
  UNGA:    { code: 'F',  name: 'Flour' },
};

export interface BasketItem {
  code:    string;
  name:    string;
  variant: string | null;
  price:   number | null;   // unit price KES
  qty:     number;
}

function resolveSku(raw: string): { code: string; name: string } | null {
  const key = raw.toUpperCase().trim();
  if (SKU_MAP[key]) return SKU_MAP[key];
  // fuzzy — check if any SKU name contains the raw input
  const match = Object.entries(SKU_MAP).find(([k, v]) =>
    v.name.toUpperCase().includes(key) || key.includes(v.name.toUpperCase())
  );
  return match ? match[1] : null;
}

// Regex captures:
// Group 1: name/code (required)
// Group 2: variant  (optional, e.g. 2kg, 500ml)
// Group 3: price    (optional, after @)
// Group 4: qty      (optional, after *)
const TOKEN_RE = /^([A-Z][A-Z\s]*)(?:\s+([A-Z0-9]+))?(?:@(\d+(?:\.\d+)?))?(?:\*(\d+))?$/i;

export function parseBasket(text: string): BasketItem[] {
  const tokens = text
    .toUpperCase()
    .split(/[,;\n]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const items: BasketItem[] = [];

  for (const token of tokens) {
    const m = token.match(TOKEN_RE);
    if (!m) continue;

    const rawName = m[1].trim();
    const rawVariant = m[2] || null;
    const price = m[3] ? parseFloat(m[3]) : null;
    const qty   = m[4] ? parseInt(m[4], 10) : 1;

    if (qty <= 0 || qty > 9999) continue;
    if (price !== null && (price <= 0 || price > 99999)) continue;

    // variant might be part of name (e.g. "PEMBE 2KG@120*2")
    // try resolving nameOrCode first, then with variant appended
    let sku = resolveSku(rawName);
    let variant = rawVariant;

    if (!sku && rawVariant) {
      // maybe the variant is actually part of a two-word name
      sku = resolveSku(`${rawName} ${rawVariant}`);
      if (sku) variant = null; // consumed into name match
    }

    if (!sku) continue;

    // Merge duplicate SKU+variant combos
    const existing = items.find(i => i.code === sku!.code && i.variant === variant);
    if (existing) {
      existing.qty += qty;
      // update price to latest declared if available
      if (price !== null) existing.price = price;
    } else {
      items.push({ code: sku.code, name: sku.name, variant, price, qty });
    }
  }

  return items;
}
