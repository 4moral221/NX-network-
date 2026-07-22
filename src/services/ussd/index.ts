// ============================================================
// NX Network — USSD Edge Function — Production v8 (Full Specification)
// ============================================================

import { t, merchantMenuStr, verifyPin, normalizePhoneNumber } from "./utils";
import { handleRegistration } from "./handlers/registration";
import { handleRecovery } from "./handlers/recovery";
import { handleCustomerMenu } from "./handlers/transactions";
import { handleMerchantMenu } from "./handlers/inventory"; // contains wallet/restock/settings
import { logError, merchantFinalise, supabase, ussdContext } from "./db";
import { cache } from "../../lib/cache";


export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handleUssdRequest = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const rawBody = await req.text();
  const body = new URLSearchParams(rawBody);
  const rawPhone = body.get("phoneNumber") || "";
  const phoneNumber = normalizePhoneNumber(rawPhone);
  const sessionId = body.get("sessionId") || "";
  let rawText = (body.get("text") || "").trim();

  // Handle Back (0) and Main Menu (00)
  if (rawText.endsWith("*00")) {
    rawText = ""; // Reset
  } else if (rawText.endsWith("*0")) {
    const p = rawText.split("*");
    p.pop(); // remove 0
    p.pop(); // remove previous
    rawText = p.join("*");
  }

  const parts = rawText === "" ? [] : rawText.split("*");
  const isDemo = String(sessionId).startsWith("DEMO");

  return ussdContext.run({ isDemo }, async () => {
    try {
      // 1. Resolve User with High-Speed Caching
      const cacheKey = `user:ussd:${phoneNumber}`;
      let user = isDemo ? null : await cache.get<any>(cacheKey);

      if (!user) {
        const phoneWithPlus = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
        const phoneWithoutPlus = phoneNumber.replace(/^\+/, "");
        const { data } = await supabase
          .from("users")
          .select("*")
          .or(`phone.eq.${phoneWithPlus},phone.eq.${phoneWithoutPlus}`)
          .maybeSingle();
        user = data || null;
        if (user && !isDemo) {
          // Cache user details for 5 minutes
          await cache.set(cacheKey, user, 300);
        }
      }
      
      // 2. Language Selection Flow (Priority #1 if not set)
      let lang = user?.language || null;

      // If user exists but language is not set, we prompt for language pick
      if (!lang && user) {
        if (parts.length === 0) {
          return new Response(`CON ${t("en", "lang_pick")}`);
        }
        if (parts[0] === "1" || parts[0] === "2") {
          lang = parts[0] === "1" ? "en" : "sw";
          await supabase.from("users").update({ language: lang }).eq("phone", phoneNumber);
          if (!isDemo) {
            await cache.delete(cacheKey); // Invalidate cache since user updated
          }
        } else {
          return new Response(`CON ${t("en", "lang_pick")}`);
        }
      }

      const currentLang = lang || "en";
      let responseText = "";

      // 3. ShortCode Shortcut Check
      if (parts.length >= 1 && parts[0].toUpperCase().startsWith("M") && parts[0].length >= 3) {
        if (!user) return new Response(`END ${t(currentLang, "not_registered")}`);
        if (user.role !== "customer") return new Response(`END ${t(currentLang, "shortcuts_customers")}`);
        
        const simulatedParts = ["3", "1", ...parts];
        responseText = await handleCustomerMenu(phoneNumber, currentLang, simulatedParts, user);
      } else {
        const hasNoLanguage = user && (user.language === null || user.language === undefined);
        const effectiveParts = (hasNoLanguage && parts.length > 0) ? parts.slice(1) : parts;

        if (effectiveParts.length === 0) {
          if (user && user.role === "merchant") {
             responseText = merchantMenuStr(user, currentLang);
          } else {
             responseText = `CON ${t(currentLang, "main_menu")}`;
          }
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
              if (!user) {
                responseText = `END ${t(currentLang, "not_registered")}`;
              } else if (user.status === "suspended") {
                responseText = `END ${t(currentLang, "fraud_suspended", { reason: "Security Policy" })}`;
              } else {
                // PIN gate
                if (effectiveParts.length === 1) {
                  responseText = `CON ${t(currentLang, "enter_login_pin")}`;
                  break;
                }
                const enteredPin = effectiveParts[1];
                const pinOk = await verifyPin(enteredPin, user.recovery_pin, phoneNumber);
                if (!pinOk) {
                  await supabase.from("nx_logs").insert({ phone: phoneNumber, context: "LOGIN_PIN_FAILED" });
                  responseText = `END ${t(currentLang, "invalid_login_pin")}`;
                  break;
                }

                const menuParts = ["3", ...effectiveParts.slice(2)];

                if (user.role === "merchant") {
                  // Pending transaction interceptor
                  const phoneWithPlus = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;
                  const phoneWithoutPlus = phoneNumber.replace(/^\+/, "");
                  const mCode = user.merchant_code || "";

                  const { data: pending } = await supabase.from("transactions")
                    .select("*")
                    .or(`merchant_code.eq.${mCode},merchant_phone.eq.${phoneWithPlus},merchant_phone.eq.${phoneWithoutPlus}`)
                    .in("status", ["awaiting_merchant", "completed", "confirmed"])
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  const isAwaiting = pending && pending.status === "awaiting_merchant";

                  if (isAwaiting && menuParts.length === 1) {
                    responseText = `CON ${t(currentLang, "merchant_confirm_prompt", {
                      amount: pending.amount,
                      phone: pending.customer_phone,
                      nx: pending.nx_redeemed
                    })}`;
                  } else if (isAwaiting && menuParts.length === 2 && (menuParts[1] === "1" || menuParts[1] === "2")) {
                    const isConfirm = menuParts[1] === "1";
                    let success = false;
                    if (isConfirm) {
                      success = await merchantFinalise(pending);
                      if (success && pending.amount >= 100) {
                        responseText = `CON ${t(currentLang, "log_basket_prompt")}`;
                      } else {
                        responseText = success ? `END Transaction Approved!` : `END Error finalizing.`;
                      }
                    } else {
                      const { error } = await supabase.from("transactions").update({
                        status: "rejected_by_merchant"
                      }).eq("id", pending.id);
                      responseText = !error ? `END Transaction Rejected.` : `END Error.`;
                    }
                  } else if (pending && (pending.status === "completed" || pending.status === "confirmed") && menuParts.length === 3 && menuParts[1] === "1") {
                    if (menuParts[2] === "2") {
                      responseText = `END Transaction Approved! Basket not logged.`;
                    } else {
                      responseText = `CON ${t(currentLang, "log_basket_enter")}`;
                    }
                  } else if (pending && (pending.status === "completed" || pending.status === "confirmed") && menuParts.length === 4 && menuParts[1] === "1" && menuParts[2] === "1") {
                    const basketInput = menuParts[3];
                    const { parseBasket } = await import("./handlers/basket");
                    const items = parseBasket(basketInput);
                    if (items.length > 0) {
                      const rows = items.map(i => ({
                        transaction_code: pending.transaction_code,
                        merchant_code: user.merchant_code,
                        sku_code: i.code,
                        sku_name: i.name,
                        variant: i.variant || null,
                        unit_price: i.price || null,
                        qty: i.qty,
                        logged_by: 'merchant'
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
                  responseText = await handleCustomerMenu(phoneNumber, currentLang, menuParts, user);
                }
              }
              break;
            }
            case "4": 
              responseText = await handleRecovery(phoneNumber, currentLang, effectiveParts);
              break;
            default:
              responseText = `CON ${t(currentLang, "main_menu")}`;
          }
        }
      }

      // Apply Global Footer to CON responses
      if (responseText.startsWith("CON ")) {
         responseText += `\n0 Back\n00 Main Menu`;
      }

      return new Response(responseText, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });

    } catch (err) {
      await logError(phoneNumber, sessionId, String(err), rawText);
      return new Response(`END ${t("en", "error")}`, { headers: { ...corsHeaders, "Content-Type": "text/plain" } });
    }
  });
};

