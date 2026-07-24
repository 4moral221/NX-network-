import { createClient } from "npm:@supabase/supabase-js@2";
import jwt from "npm:jsonwebtoken@9";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET") || "super-secret-jwt-key-with-at-least-32-characters-long!";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function normalizePhone(rawPhone: string): { e164: string; withoutPlus: string; local: string } {
  if (!rawPhone) return { e164: "", withoutPlus: "", local: "" };
  let clean = rawPhone.trim().replace(/\s+/g, "").replace(/[-()]/g, "");
  let e164 = clean;
  if (clean.startsWith("0")) {
    e164 = "+254" + clean.slice(1);
  } else if (/^[17]\d{8}$/.test(clean)) {
    e164 = "+254" + clean;
  } else if (clean.startsWith("254") && !clean.startsWith("+")) {
    e164 = "+" + clean;
  } else if (!clean.startsWith("+") && clean.length > 0) {
    e164 = "+" + clean;
  }
  const withoutPlus = e164.replace(/^\+/, "");
  const local = e164.startsWith("+254") ? "0" + e164.substring(4) : e164;
  return { e164, withoutPlus, local };
}

async function verifyUserPin(pin: string, hash: string | null | undefined, phone: string): Promise<boolean> {
  if (!hash) return false;
  if (hash === pin) return true;

  // 1. Try pgcrypto verify_password RPC
  try {
    const { data, error } = await supabase.rpc("verify_password", { password: pin, hash });
    if (!error && data === true) return true;
  } catch (_e) {
    // Ignore RPC error
  }

  // 2. Try SHA-256 fallback matches (with/without phone salt)
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

    const msgAlone = new TextEncoder().encode(pin);
    const bufAlone = await crypto.subtle.digest("SHA-256", msgAlone);
    const shaAlone = Array.from(new Uint8Array(bufAlone)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash === shaAlone) return true;
  } catch (_e) {
    // Ignore SHA256 error
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS, status: 204 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { phone, pin, action } = body;

    // Refresh action
    if (action === "refresh") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return json({ error: "Missing Bearer token" }, 401);
      }
      const token = authHeader.split(" ")[1];
      try {
        const decoded: any = jwt.verify(token, SUPABASE_JWT_SECRET);
        const { data: user, error: uErr } = await supabase
          .from("users")
          .select("id, name, phone, role, merchant_code, location, status, language, is_first_purchase_used, franchise_tier, acceptance_percent")
          .eq("id", decoded.sub)
          .single();

        if (uErr || !user) return json({ error: "User session expired or user not found" }, 401);

        // Sign fresh token
        const newToken = jwt.sign(
          {
            aud: "authenticated",
            exp: Math.floor(Date.now() / 1000) + 14 * 24 * 3600,
            sub: user.id,
            role: "authenticated",
            email: `${user.phone}@pwa.nxnetwork.company`,
            phone: user.phone,
            app_metadata: { provider: "pwa_phone", providers: ["pwa_phone"], user_role: user.role },
            user_metadata: { name: user.name, role: user.role, merchant_code: user.merchant_code }
          },
          SUPABASE_JWT_SECRET
        );

        return json({ success: true, user, access_token: newToken });
      } catch (e: any) {
        return json({ error: `Invalid session token: ${e.message}` }, 401);
      }
    }

    // Standard Login
    if (!phone || !pin) {
      return json({ error: "Phone number and PIN are required" }, 400);
    }

    const { e164, withoutPlus, local } = normalizePhone(phone);

    const { data: users, error: dbError } = await supabase
      .from("users")
      .select("*")
      .or(`phone.eq.${e164},phone.eq.${withoutPlus},phone.eq.${local}`)
      .limit(1);

    if (dbError) {
      return json({ error: `Database error: ${dbError.message}` }, 500);
    }

    const user = users?.[0];
    if (!user) {
      return json({ error: "Phone number not registered" }, 404);
    }

    if (user.status === "suspended") {
      return json({ error: "Account suspended due to security policy" }, 403);
    }

    const trimmedPin = String(pin).trim();
    const pinValid = await verifyUserPin(trimmedPin, user.recovery_pin, normalizedPhone);

    if (!pinValid) {
      return json({ error: "Invalid PIN" }, 401);
    }

    // Clean sensitive hash from returned object
    const safeUser = { ...user };
    delete safeUser.recovery_pin;

    // Issue Supabase Auth JWT Token for PWA session
    const expiresSeconds = 14 * 24 * 3600; // 14 days
    const tokenPayload = {
      aud: "authenticated",
      exp: Math.floor(Date.now() / 1000) + expiresSeconds,
      sub: user.id,
      role: "authenticated",
      email: `${user.phone}@pwa.nxnetwork.company`,
      phone: user.phone,
      app_metadata: {
        provider: "pwa_phone",
        providers: ["pwa_phone"],
        user_role: user.role
      },
      user_metadata: {
        name: user.name,
        role: user.role,
        merchant_code: user.merchant_code
      }
    };

    const token = jwt.sign(tokenPayload, SUPABASE_JWT_SECRET);

    return json({
      success: true,
      user: safeUser,
      access_token: token,
      expires_in: expiresSeconds
    });

  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, 500);
  }
});
