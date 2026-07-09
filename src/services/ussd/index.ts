// ============================================================
// NX Network — USSD Edge Function — Production v8 (Full Specification)
// ============================================================

import { createClient } from "@supabase/supabase-js";
import { t, merchantMenuStr } from "./utils";
import { handleRegistration } from "./handlers/registration";
import { handleRecovery } from "./handlers/recovery";
import { handleCustomerMenu } from "./handlers/transactions";
import { handleMerchantMenu } from "./handlers/inventory"; // contains wallet/restock/settings
import { logError, merchantFinalise } from "./db";
import { cache } from "../../lib/cache";

const getEnv = (key: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL') || '';
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_ANON_KEY') || '';

// Mock Supabase if keys are missing to prevent top-level crash
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : new Proxy({}, { get: () => () => ({ select: () => ({ eq: () => Promise.reject("Supabase not set") }) }) }) as any;


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
  const phoneNumber = body.get("phoneNumber") || "";
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

  try {
    // 1. Resolve User with High-Speed Caching
    const cacheKey = `user:ussd:${phoneNumber}`;
    let user = await cache.get<any>(cacheKey);

    if (!user) {
      const { data } = await supabase.from("users").select("*").eq("phone", phoneNumber).maybeSingle();
      user = data || null;
      if (user) {
        // Cache user details for 5 minutes
        await cache.set(cacheKey, user, 300);
      }
    }
    
    // 2. Language Selection Flow (Priority #1 if not set)
    let lang = user?.language || null;

    // If language is not set, we MUST stay in the language pick menu until selected
    if (!lang) {
      if (parts.length === 0) {
        return new Response(`CON ${t("en", "lang_pick")}`);
      }
      if (parts[0] === "1" || parts[0] === "2") {
        lang = parts[0] === "1" ? "en" : "sw";
        // If user already exists, update their language. If not, we'll use this lang for registration.
        if (user) {
          await supabase.from("users").update({ language: lang }).eq("phone", phoneNumber);
          await cache.delete(cacheKey); // Invalidate cache since user updated
        }
      } else {
        return new Response(`CON ${t("en", "lang_pick")}`);
      }
      // Note: If lang was just picked, we might want to proceed to the main menu in the same request
      // But Africa's Talking appends the pick to the text, so the next request will have parts[0]=1
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
      const effectiveParts = (user?.language === null && parts.length > 0) ? parts.slice(1) : parts;

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
          case "3": 
            if (!user) {
                responseText = `END ${t(currentLang, "not_registered")}`;
            } else if (user.status === "suspended") {
                responseText = `END ${t(currentLang, "fraud_suspended", { reason: "Security Policy" })}`;
            } else if (user.role === "merchant") {
                // INTERCEPTOR: If there's a pending transaction, show it first before the menu
                const { data: pending } = await supabase.from("transactions")
                  .select("*")
                  .eq("merchant_phone", phoneNumber)
                  .eq("status", "awaiting_merchant")
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (pending && effectiveParts.length === 1) {
                  responseText = `CON ${t(currentLang, "merchant_confirm_prompt", {
                    amount: pending.amount,
                    phone: pending.customer_phone,
                    nx: pending.nx_redeemed
                  })}`;
                } else if (pending && effectiveParts.length === 2 && (effectiveParts[1] === "1" || effectiveParts[1] === "2")) {
                  const isConfirm = effectiveParts[1] === "1";
                  let success = false;
                  if (isConfirm) {
                    success = await merchantFinalise(pending);
                  } else {
                    const { error } = await supabase.from("transactions").update({
                      status: "rejected_by_merchant"
                    }).eq("id", pending.id);
                    success = !error;
                  }
                  responseText = success ? `END ${isConfirm ? "Transaction Approved!" : "Transaction Rejected."}` : `END Error finalizing.`;
                } else {
                  responseText = await handleMerchantMenu(phoneNumber, currentLang, effectiveParts, user);
                }
            } else {
                responseText = await handleCustomerMenu(phoneNumber, currentLang, effectiveParts, user);
            }
            break;
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
};

