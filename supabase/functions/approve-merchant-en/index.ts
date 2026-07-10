import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const AT_API_KEY  = Deno.env.get("AT_API_KEY")  ?? "";
const AT_USERNAME = Deno.env.get("AT_USERNAME") ?? "sandbox";
const AT_SANDBOX  = Deno.env.get("AT_SANDBOX") === "true";
const AT_SMS_URL  = AT_SANDBOX
  ? "https://api.sandbox.africastalking.com/version1/messaging"
  : "https://api.africastalking.com/version1/messaging";

async function sendSMS(to: string, message: string) {
  try {
    await fetch(AT_SMS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": AT_API_KEY,
        "Accept": "application/json",
      },
      body: new URLSearchParams({ username: AT_USERNAME, to, message, from: "6180" }).toString(),
    });
  } catch (err) { console.error("SMS failed:", err); }
}

async function generateMerchantCode(): Promise<string> {
  const code = "M" + Math.floor(100000 + Math.random() * 900000);
  const { data } = await supabase.from("users").select("id").eq("merchant_code", code).maybeSingle();
  if (data) return generateMerchantCode();
  return code;
}

Deno.serve(async (req) => {
  try {
    const payload    = await req.json();
    const record     = payload.record;
    const old_record = payload.old_record;

    // Only act when status flips TO approved
    if (record?.status !== "approved" || old_record?.status === "approved") {
      return new Response("ignored", { status: 200 });
    }

    const { phone, business_name, location, national_id, recovery_pin } = record;
    if (!phone || !business_name) {
      return new Response("missing fields", { status: 400 });
    }

    // Check not already registered
    const { data: existing } = await supabase
      .from("users").select("phone").eq("phone", phone).maybeSingle();
    if (existing) {
      console.log(`${phone} already registered, skipping.`);
      return new Response("already exists", { status: 200 });
    }

    const code = await generateMerchantCode();

    // recovery_pin carried from merchant_applications (already hashed at registration)
    // If missing (legacy application), merchant will need to set PIN via USSD reset flow
    const { error } = await supabase.from("users").insert({
      phone,
      name:               business_name,
      role:               "merchant",
      merchant_code:      code,
      location:           location || "",
      national_id:        national_id || null,
      recovery_pin:       recovery_pin || null,   // hashed PIN from application
      acceptance_percent: 0.2,
      franchise_tier:     "BASIC",
      status:             "active",
    });

    if (error) {
      console.error("User insert failed:", error.message);
      return new Response("insert failed", { status: 500 });
    }

    // Initialise merchant margin row
    await supabase.from("merchant_margins").insert({ merchant_code: code, gross_margin: 0 });

    // Notify merchant
    const pinMsg = recovery_pin
      ? "Use the PIN you set during registration to login."
      : "Dial option 5 to set your PIN before logging in.";

    await sendSMS(phone,
      `Hongera! NX merchant application approved.\nCode: ${code}\n${pinMsg}\nDial *384*6180# to start.`
    );

    // Update application record
    await supabase.from("merchant_applications")
      .update({ merchant_code: code, approved_at: new Date().toISOString() })
      .eq("phone", phone);

    console.log(`Merchant approved: ${phone} -> ${code}`);
    return new Response(JSON.stringify({ success: true, code }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Approval error:", err);
    return new Response("error", { status: 500 });
  }
});
