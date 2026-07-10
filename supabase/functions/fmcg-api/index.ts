// ============================================================
// NX Network — Partner API (FMCG + Wholesaler + Logistics)
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ADMIN_SECRET = Deno.env.get("FMCG_ADMIN_SECRET") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, X-Admin-Secret",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

async function hashKey(key: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,"0")).join("");
}

async function generateApiKey(prefix: string): Promise<string> {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const hex   = Array.from(bytes).map(b => b.toString(16).padStart(2,"0")).join("");
  return `${prefix}_live_${hex}`;
}

async function verifyKey(req: Request): Promise<{ partner: any; keyRecord: any; error?: string }> {
  const apiKey = req.headers.get("X-API-Key")?.trim();
  if (!apiKey) return { partner: null, keyRecord: null, error: "Missing X-API-Key" };

  const keyHash = await hashKey(apiKey);
  const { data: keyRecord, error } = await supabase
    .from("api_keys")
    .select("*, partner:partners(id, company_name, status)")
    .eq("key_hash", keyHash)
    .eq("revoked", false)
    .maybeSingle();

  if (error || !keyRecord) return { partner: null, keyRecord: null, error: "Invalid or revoked API key" };
  if (keyRecord.expires_at && new Date() > new Date(keyRecord.expires_at))
    return { partner: null, keyRecord: null, error: "API key expired" };

  const { data: fmcgPartner } = await supabase.from("fmcg_partners").select("*").eq("id", keyRecord.partner_id).maybeSingle();
  return { partner: fmcgPartner || keyRecord.partner, keyRecord };
}

function hasScope(keyRecord: any, required: string): boolean {
  return (keyRecord?.scope || []).includes(required);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS, status: 204 });

  const url      = new URL(req.url);
  const endpoint = url.pathname.split("/").filter(Boolean).pop();

  // ── GENERATE KEY (admin) ─────────────────────────────────
  if (endpoint === "generate-key" && req.method === "POST") {
    if (req.headers.get("X-Admin-Secret") !== ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => null);
    if (!body?.name || !body?.partner_type) return json({ error: "name and partner_type required" }, 400);
    const { name, contact, partner_type } = body;
    const validTypes = ["fmcg", "wholesaler", "logistics"];
    if (!validTypes.includes(partner_type)) return json({ error: `partner_type must be one of: ${validTypes.join(", ")}` }, 400);

    const scopeMap: Record<string, string[]> = {
      fmcg:       ["demand:read", "batch:bid", "margin:write", "prices:read"],
      wholesaler: ["batch:read", "fulfil:write", "invoice:write"],
      logistics:  ["restock:read", "delivery:write"],
    };

    const { data: fp, error: fpErr } = await supabase.from("fmcg_partners").insert({ name, contact: contact ?? null, partner_type, active: true }).select("id, name").single();
    if (fpErr) return json({ error: "Failed to create partner", detail: fpErr.message }, 500);

    const rawKey  = await generateApiKey(partner_type);
    const keyHash = await hashKey(rawKey);
    const prefix  = rawKey.slice(0, rawKey.indexOf("_live_") + 10) + "...";

    const { error: keyErr } = await supabase.from("api_keys").insert({
      partner_id: fp.id, key_hash: keyHash, prefix, last4: rawKey.slice(-4), partner_type, scope: scopeMap[partner_type],
    });
    if (keyErr) return json({ error: "Failed to create API key", detail: keyErr.message }, 500);

    return json({ message: "Key generated — save this, it will NOT be shown again.", partner_id: fp.id, name: fp.name, partner_type, scope: scopeMap[partner_type], api_key: rawKey });
  }

  // ── REVOKE KEY (admin) ───────────────────────────────────
  if (endpoint === "revoke-key" && req.method === "POST") {
    if (req.headers.get("X-Admin-Secret") !== ADMIN_SECRET) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => null);
    if (!body?.partner_id) return json({ error: "partner_id required" }, 400);
    await supabase.from("api_keys").update({ revoked: true }).eq("partner_id", body.partner_id);
    return json({ message: `Keys revoked for partner ${body.partner_id}` });
  }

  // ── STATUS ───────────────────────────────────────────────
  if (endpoint === "status" && req.method === "GET") {
    const { partner, keyRecord, error } = await verifyKey(req);
    if (!partner) return json({ error }, 401);
    return json({ name: partner.name, partner_type: keyRecord.partner_type, scope: keyRecord.scope, active: partner.active });
  }

  // ════════════════════════════════════════════════════════
  // FMCG ENDPOINTS
  // ════════════════════════════════════════════════════════

  if (endpoint === "contribute" && req.method === "POST") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "margin:write")) return json({ error: "Insufficient scope" }, 403);
    const body = await req.json().catch(() => null);
    const { merchant_code, contribution_amount, effective_from, effective_to, notes } = body || {};
    if (!merchant_code || !contribution_amount) return json({ error: "merchant_code and contribution_amount required" }, 400);
    if (Number(contribution_amount) <= 0) return json({ error: "contribution_amount must be positive" }, 400);
    const { data: merchant } = await supabase.from("users").select("merchant_code, name").eq("merchant_code", merchant_code).maybeSingle();
    if (!merchant) return json({ error: `Merchant ${merchant_code} not found` }, 404);
    const today = new Date().toISOString().slice(0, 10);
    const { error: insertErr } = await supabase.from("fmcg_margin_contributions").insert({
      merchant_code, fmcg_id: partner.id, fmcg_name: partner.name, contribution_amount: Number(contribution_amount),
      effective_from: effective_from ?? today, effective_to: effective_to ?? null, notes: notes ?? null,
    });
    if (insertErr) return json({ error: "Failed to save contribution", detail: insertErr.message }, 500);
    return json({ success: true, merchant_code, contribution_amount: Number(contribution_amount), effective_from: effective_from ?? today });
  }

  if (endpoint === "demand" && req.method === "GET") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "demand:read")) return json({ error: "Insufficient scope" }, 403);
    const { data } = await supabase.from("restock_requests").select("sku_code, sku_name, quantity, variant_code, merchant_code, requested_at").eq("status", "pending").order("requested_at", { ascending: false });
    return json({ demand: data || [] });
  }

  // ════════════════════════════════════════════════════════
  // WHOLESALER ENDPOINTS
  // ════════════════════════════════════════════════════════

  if (endpoint === "batches" && req.method === "GET") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "batch:read")) return json({ error: "Insufficient scope" }, 403);
    const { data, error } = await supabase.from("restock_batches").select("id, sku_code, variant_code, total_quantity, merchant_count, status, offered_price, created_at").eq("wholesaler_id", partner.id).order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ batches: data || [] });
  }

  if (endpoint === "invoices" && req.method === "GET") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "batch:read")) return json({ error: "Insufficient scope" }, 403);
    const { data, error } = await supabase.from("restock_invoices").select("id, merchant_code, invoice_amount, nx_paid, cash_due, status, logistics_status, created_at, fulfilled_at").eq("wholesaler_id", partner.id).order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ invoices: data || [] });
  }

  // POST /fulfil — FIXED: invoice amount now uses each merchant's actual
  // requested quantity × unit price, not a flat batch average.
  if (endpoint === "fulfil" && req.method === "POST") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "fulfil:write")) return json({ error: "Insufficient scope" }, 403);

    const body = await req.json().catch(() => null);
    if (!body?.batch_id) return json({ error: "batch_id required" }, 400);

    const { data: batch } = await supabase.from("restock_batches").select("id, status, sku_code, offered_price").eq("id", body.batch_id).eq("wholesaler_id", partner.id).maybeSingle();
    if (!batch) return json({ error: "Batch not found or not assigned to you" }, 404);
    if (batch.status === "fulfilled") return json({ error: "Batch already fulfilled" }, 409);

    const { error: updateErr } = await supabase.from("restock_batches").update({ status: "fulfilled", updated_at: new Date().toISOString() }).eq("id", body.batch_id);
    if (updateErr) return json({ error: updateErr.message }, 500);

    const { data: requests } = await supabase.from("restock_requests").select("id, merchant_code, merchant_phone, quantity").eq("batch_id", body.batch_id).eq("status", "approved");

    // Each merchant billed for their OWN quantity × unit price — not a batch average
    const unitPrice = batch.offered_price || 0;
    const invoiceInserts = (requests || []).map(r => ({
      merchant_code:      r.merchant_code,
      restock_request_id: r.id,
      wholesaler_id:      partner.id,
      wholesaler_name:    partner.name,
      invoice_amount:     (r.quantity || 0) * unitPrice,
      status:             "pending",
      logistics_status:   "pending_dispatch",
      notes:              body.notes ?? null,
    }));

    if (invoiceInserts.length > 0) {
      const { error: invErr } = await supabase.from("restock_invoices").insert(invoiceInserts);
      if (invErr) return json({ error: "Batch updated but invoice creation failed", detail: invErr.message }, 500);
    }

    return json({ success: true, batch_id: body.batch_id, sku_code: batch.sku_code, invoices_created: invoiceInserts.length, message: `Batch fulfilled. ${invoiceInserts.length} invoice(s) created, billed per merchant quantity.` });
  }

  if (endpoint === "invoice" && req.method === "PATCH") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "invoice:write")) return json({ error: "Insufficient scope" }, 403);
    const body = await req.json().catch(() => null);
    if (!body?.invoice_id) return json({ error: "invoice_id required" }, 400);
    const { data: invoice } = await supabase.from("restock_invoices").select("id, status").eq("id", body.invoice_id).eq("wholesaler_id", partner.id).maybeSingle();
    if (!invoice) return json({ error: "Invoice not found or not yours" }, 404);
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (body.cash_received !== undefined) updates.cash_received = body.cash_received;
    if (body.cash_status   !== undefined) updates.cash_status   = body.cash_status;
    if (body.notes         !== undefined) updates.notes         = body.notes;
    if (body.cash_status === "received") updates.cash_confirmed_at = new Date().toISOString();
    const { error: updateErr } = await supabase.from("restock_invoices").update(updates).eq("id", body.invoice_id);
    if (updateErr) return json({ error: updateErr.message }, 500);
    return json({ success: true, invoice_id: body.invoice_id, updates });
  }

  // ════════════════════════════════════════════════════════
  // LOGISTICS (3PL) ENDPOINTS
  // ════════════════════════════════════════════════════════

  // GET /dispatch — invoices ready for pickup (pending_dispatch or in_transit)
  if (endpoint === "dispatch" && req.method === "GET") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "restock:read")) return json({ error: "Insufficient scope" }, 403);
    const { data, error } = await supabase.from("restock_invoices")
      .select("id, merchant_code, invoice_amount, logistics_status, wholesaler_name, created_at")
      .in("logistics_status", ["pending_dispatch", "in_transit"])
      .order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ deliveries: data || [] });
  }

  // PATCH /delivery — update logistics status, optionally attach driver + confirm delivery
  // Body: { invoice_id, logistics_status, driver_name?, delivered_by? }
  if (endpoint === "delivery" && req.method === "PATCH") {
    const { partner, keyRecord, error: authErr } = await verifyKey(req);
    if (!partner) return json({ error: authErr }, 401);
    if (!hasScope(keyRecord, "delivery:write")) return json({ error: "Insufficient scope" }, 403);

    const body = await req.json().catch(() => null);
    if (!body?.invoice_id || !body?.logistics_status) return json({ error: "invoice_id and logistics_status required" }, 400);

    const validStatuses = ["pending_dispatch", "in_transit", "delivered", "failed"];
    if (!validStatuses.includes(body.logistics_status)) return json({ error: `logistics_status must be one of: ${validStatuses.join(", ")}` }, 400);

    const { data: invoice } = await supabase.from("restock_invoices").select("id, merchant_code").eq("id", body.invoice_id).maybeSingle();
    if (!invoice) return json({ error: "Invoice not found" }, 404);

    const updates: Record<string, any> = { logistics_status: body.logistics_status, updated_at: new Date().toISOString() };
    if (body.driver_name  !== undefined) updates.driver_name  = body.driver_name;
    if (body.delivered_by !== undefined) updates.delivered_by = body.delivered_by;
    if (body.logistics_status === "delivered") updates.delivered_at = new Date().toISOString();

    const { error: updateErr } = await supabase.from("restock_invoices").update(updates).eq("id", body.invoice_id);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({ success: true, invoice_id: body.invoice_id, logistics_status: body.logistics_status });
  }

  return json({ error: "Not found" }, 404);
});
