import { supabase } from "../db.ts";
import { t } from "../utils.ts";

export async function handleHubMenu(phoneNumber: string, lang: string, parts: string[], user: any) {
  // parts: 3 (Continue) -> 4 (My Hub) -> choice
  const subChoice = parts[2];

  if (!subChoice) {
    return `CON ${t(lang, "hub_menu")}`;
  }

  switch (subChoice) {
    case "1": // Tier Status
      const { count } = await supabase.from("merchant_whitelist")
        .select("*", { count: "exact", head: true })
        .eq("hub_merchant_code", user.merchant_code);
      
      return `END ${t(lang, "hub_stats", { count: count || 0, tier: user.franchise_tier })}`;
    
    case "2": // Enroll Sub-merchant
      if (parts.length === 3) return `CON ${t(lang, "hub_enroll_prompt")}`;
      const subPhone = parts[3].trim();
      
      const { data: existing } = await supabase.from("users").select("id").eq("phone", subPhone).maybeSingle();
      if (existing) return `END Already registered / Hub limit reached`;

      const { error } = await supabase.from("merchant_whitelist").insert({
        phone: subPhone,
        hub_merchant_code: user.merchant_code,
        tier: "BASIC"
      });

      return error 
        ? `END ${t(lang, "hub_enroll_failed")}`
        : `END Enrolled! ${subPhone} added to your hub.`;

    case "3": // Earnings
      const { data: comms } = await supabase.from("hub_commissions")
        .select("commission_amount")
        .eq("hub_merchant_code", user.merchant_code)
        .eq("paid_out", false);
      
      const total = (comms || []).reduce((s, c) => s + Number(c.commission_amount), 0);
      return `END ${t(lang, "hub_earnings_detail", { 
        accrued: total.toFixed(1), 
        unpaid: total.toFixed(1),
        last: "None"
      })}`;

    default:
      return `CON ${t(lang, "hub_menu")}`;
  }
}
