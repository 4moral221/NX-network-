import { createClient } from "npm:@supabase/supabase-js@2";
import { parseSmsOrder, sendSms, normalisePhone } from "./utils.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body  = new URLSearchParams(await req.text());
    const from  = normalisePhone(body.get("from") || "");
    const text  = (body.get("text") || "").trim();

    if (!from || !text) {
      return new Response("missing fields", { status: 400 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("phone, name, merchant_code, role, status, language")
      .eq("phone", from)
      .maybeSingle();

    if (!user) {
      await sendSms(
        from,
        `NX Network: We don't recognise this number.\nTo register as a merchant dial *384*6180# and select Register.`
      );
      return new Response("ok", { status: 200 });
    }

    if (user.role !== "merchant") {
      await sendSms(from, `NX Network: SMS restock is for merchants only.\nDial *384*6180# for your account.`);
      return new Response("ok", { status: 200 });
    }

    if (user.status === "suspended") {
      await sendSms(from, `NX Network: Your account is suspended. Contact support.`);
      return new Response("ok", { status: 200 });
    }

    const lang = user.language || "en";
    const { items, variants, errors } = parseSmsOrder(text, lang);

    if (items.length === 0) {
      await sendSms(from, `NX Network: Could not read your order.\nFormat: BR*10, ML*5, SG*3\nWith sizes: pembe 2kg*10, milk 500ml*24\nCodes: BR=Bread ML=Milk SG=Sugar CO=Oil F=Flour`);
      return new Response("ok", { status: 200 });
    }

    const { error: insertErr } = await supabase.from("restock_requests").insert({
      merchant_code:  user.merchant_code,
      merchant_phone: from,
      raw_input:      text,
      items,
      variants,
      status:         "pending",
      source:         "sms",
    });

    if (insertErr) {
      console.error("restock insert error:", insertErr);
      await sendSms(from, `NX Network: Order failed to log. Please try again.`);
      return new Response("ok", { status: 200 });
    }

    const totalQty  = items.reduce((s: number, i: any) => s + Number(i.qty), 0);
    const itemCount = items.length;
    const warn      = errors.length > 0 ? `\n(${errors.length} unrecognised item(s) skipped)` : "";

    await sendSms(from, `NX Restock logged: ${itemCount} item(s), ${totalQty} units total.${warn}\nWe'll notify you when dispatched.`);

    return new Response("ok", { status: 200 });

  } catch (err) {
    console.error("sms-restock error:", err);
    return new Response("internal error", { status: 500 });
  }
});
