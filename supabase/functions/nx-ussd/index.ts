// NX Network — USSD v9 (basket logging)
import { createClient } from "npm:@supabase/supabase-js@2";
import { t, merchantMenuStr } from "./utils.ts";
import { handleRegistration } from "./handlers/registration.ts";
import { handleRecovery } from "./handlers/recovery.ts";
import { handlePinReset } from "./handlers/pin_reset.ts";
import { handleCustomerMenu } from "./handlers/transactions.ts";
import { handleMerchantMenu } from "./handlers/inventory.ts";
import { logError, merchantFinalise } from "./db.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const rawBody = await req.text();
  const body = new URLSearchParams(rawBody);
  const phoneNumber = body.get("phoneNumber") || "";
  const sessionId  = body.get("sessionId")  || "";
  let rawText = (body.get("text") || "").trim();

  if (rawText.endsWith("*00")) rawText = "";
  else if (rawText.endsWith("*0")) {
    const p = rawText.split("*"); p.pop(); p.pop(); rawText = p.join("*");
  }

  const parts = rawText === "" ? [] : rawText.split("*");

  try {
    const { data: user } = await supabase.from("users").select("*").eq("phone", phoneNumber).maybeSingle();
    let lang = user?.language || null;

    if (!lang) {
      if (parts.length === 0) return new Response(`CON ${t("en", "lang_pick")}`);
      if (parts[0] === "1" || parts[0] === "2") {
        lang = parts[0] === "1" ? "en" : "sw";
        if (user) await supabase.from("users").update({ language: lang }).eq("phone", phoneNumber);
      } else return new Response(`CON ${t("en", "lang_pick")}`);
    }

    const currentLang = lang || "en";
    let responseText = "";

    if (parts.length >= 1 && parts[0].toUpperCase().startsWith("M") && parts[0].length >= 3) {
      if (!user) return new Response(`END ${t(currentLang, "not_registered")}`);
      if (user.role !== "customer") return new Response(`END ${t(currentLang, "shortcuts_customers")}`);
      const simulatedParts = ["3", "1", ...parts];
      responseText = await handleCustomerMenu(phoneNumber, currentLang, simulatedParts, user);
    } else {
      const effectiveParts = (user?.language === null && parts.length > 0) ? parts.slice(1) : parts;

      if (effectiveParts.length === 0) {
        responseText = (user && user.role === "merchant")
          ? merchantMenuStr(user, currentLang)
          : `CON ${t(currentLang, "main_menu")}`;
      } else {
        const rootChoice = effectiveParts[0];
        switch (rootChoice) {
          case "1":
            responseText = await handleRegistration(phoneNumber, currentLang, effectiveParts);
            break;
          case "2":
            responseText = `END ${t(currentLang, "help")}`;
            break;
          case "3": {
            if (!user) { responseText = `END ${t(currentLang, "not_registered")}`; break; }
            if (user.status === "suspended") { responseText = `END ${t(currentLang, "fraud_suspended", { reason: "Security Policy" })}`; break; }

            // PIN gate
            if (effectiveParts.length === 1) { responseText = `CON ${t(currentLang, "enter_login_pin")}`; break; }
            const enteredPin = effectiveParts[1];
            const { data: pinOk } = await supabase.rpc("verify_password", { password: enteredPin, hash: user.recovery_pin });
            if (!pinOk) {
              await supabase.from("nx_logs").insert({ phone: phoneNumber, context: "LOGIN_PIN_FAILED" });
              responseText = `END ${t(currentLang, "invalid_login_pin")}`; break;
            }

            const menuParts = ["3", ...effectiveParts.slice(2)];

            if (user.role === "merchant") {
              // Pending transaction interceptor
              const { data: pending } = await supabase.from("transactions")
                .select("*").eq("merchant_phone", phoneNumber).eq("status", "awaiting_merchant")
                .order("created_at", { ascending: false }).limit(1).maybeSingle();

              if (pending && menuParts.length === 1) {
                responseText = `CON ${t(currentLang, "merchant_confirm_prompt", { amount: pending.amount, phone: pending.customer_phone, nx: pending.nx_redeemed })}`;
              } else if (pending && menuParts.length === 2 && (menuParts[1] === "1" || menuParts[1] === "2")) {
                const isConfirm = menuParts[1] === "1";
                if (isConfirm) {
                  const success = await merchantFinalise(pending);
                  if (success && pending.amount >= 100) {
                    // Offer basket logging if transaction >= KES 100
                    responseText = `CON ${t(currentLang, "log_basket_prompt")}`;
                  } else {
                    responseText = success ? `END Transaction Approved!` : `END Error finalizing.`;
                  }
                } else {
                  const { error } = await supabase.from("transactions").update({ status: "rejected_by_merchant" }).eq("id", pending.id);
                  responseText = !error ? `END Transaction Rejected.` : `END Error.`;
                }
              } else if (pending && menuParts.length === 3 && menuParts[1] === "1") {
                // Basket logging step — merchant enters items or skips
                if (menuParts[2] === "2") {
                  responseText = `END Transaction Approved! Basket not logged.`;
                } else {
                  responseText = `CON ${t(currentLang, "log_basket_enter")}`;
                }
              } else if (pending && menuParts.length === 4 && menuParts[1] === "1" && menuParts[2] === "1") {
                // Parse and save basket items
                const basketInput = menuParts[3];
                const { parseBasket } = await import("./handlers/basket.ts");
                const items = parseBasket(basketInput);
                if (items.length > 0) {
                  const rows = items.map(i => ({
                    transaction_code: pending.transaction_code,
                    merchant_code:    user.merchant_code,
                    sku_code:         i.code,
                    sku_name:         i.name,
                    variant:          i.variant || null,
                    unit_price:       i.price   || null,
                    qty:              i.qty,
                    logged_by:        'merchant'
                  }));
                  await supabase.from("transaction_items").insert(rows);
                  responseText = `END Approved! ${items.length} item(s) logged.`;
                } else {
                  responseText = `END Approved! Could not parse items.`;
                }
              } else {
                responseText = await handleMerchantMenu(phoneNumber, currentLang, menuParts, user);
              }
            } else {
              // Customer side — check if transaction just completed and amount >= 100
              const { data: justPaid } = await supabase.from("transactions")
                .select("*").eq("customer_phone", phoneNumber)
                .in("status", ["completed", "confirmed"])
                .order("created_at", { ascending: false }).limit(1).maybeSingle();

              // Check if basket already logged for this txn
              if (justPaid && justPaid.amount >= 100 && menuParts.length === 1) {
                const { count } = await supabase.from("transaction_items")
                  .select("*", { count: 'exact', head: true })
                  .eq("transaction_code", justPaid.transaction_code);
                if ((count || 0) === 0) {
                  responseText = `CON ${t(currentLang, "log_basket_prompt")}`;
                } else {
                  responseText = await handleCustomerMenu(phoneNumber, currentLang, menuParts, user);
                }
              } else if (justPaid && menuParts.length === 2 && menuParts[1] === "1") {
                responseText = `CON ${t(currentLang, "log_basket_enter")}`;
              } else if (justPaid && menuParts.length === 2 && menuParts[1] === "2") {
                responseText = await handleCustomerMenu(phoneNumber, currentLang, ["3"], user);
              } else if (justPaid && menuParts.length === 3 && menuParts[1] === "1") {
                const basketInput = menuParts[2];
                const { parseBasket } = await import("./handlers/basket.ts");
                const items = parseBasket(basketInput);
                if (items.length > 0) {
                  const rows = items.map(i => ({
                    transaction_code: justPaid.transaction_code,
                    merchant_code:    justPaid.merchant_code,
                    sku_code:         i.code,
                    sku_name:         i.name,
                    variant:          i.variant || null,
                    unit_price:       i.price   || null,
                    qty:              i.qty,
                    logged_by:        'customer'
                  }));
                  await supabase.from("transaction_items").insert(rows);
                  responseText = `END Thanks! ${items.length} item(s) logged.`;
                } else {
                  responseText = await handleCustomerMenu(phoneNumber, currentLang, menuParts, user);
                }
              } else {
                responseText = await handleCustomerMenu(phoneNumber, currentLang, menuParts, user);
              }
            }
            break;
          }
          case "4":
            responseText = await handleRecovery(phoneNumber, currentLang, effectiveParts); break;
          case "5":
            responseText = await handlePinReset(phoneNumber, currentLang, effectiveParts); break;
          default:
            responseText = `CON ${t(currentLang, "main_menu")}`;
        }
      }
    }

    if (responseText.startsWith("CON ")) responseText += `\n0 Back\n00 Main Menu`;
    return new Response(responseText, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });

  } catch (err) {
    await logError(phoneNumber, sessionId, String(err), rawText);
    return new Response(`END ${t("en", "error")}`, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
  }
});
