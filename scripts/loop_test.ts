import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

process.on("uncaughtException", (err) => console.error("Uncaught exception:", err));
process.on("unhandledRejection", (reason) => console.error("Unhandled rejection:", reason));

async function main() {
  console.log("======================================================================");
  console.log("       NX NETWORK 10-MINUTE LOOP TEST (RESTARTED)     ");
  console.log("======================================================================");

  const merchantPhone = "254703267919";
  const customerPhone = "254781550151";
  const durationMs = 10 * 60 * 1000;
  const startTime = Date.now();

  const { data: merchant } = await supabase.from("users").select("*").eq("phone", merchantPhone).single();
  
  if (!merchant) {
    console.error("Merchant or Customer not found.");
    process.exit(1);
  }

  console.log(`Starting loop for merchant ${merchant.merchant_code} and customer ${customerPhone}`);
  
  let loopCount = 0;
  
  while (Date.now() - startTime < durationMs) {
    loopCount++;
    const amount = 100 + Math.floor(Math.random() * 50); 
    
    try {
      const paySessionId = "USSD_PAY_" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const payParams = new URLSearchParams();
      payParams.set("sessionId", paySessionId);
      payParams.set("phoneNumber", customerPhone);
      payParams.set("text", `3*1*${merchant.merchant_code}*${amount}*1`);

      const payRes = await fetch("http://localhost:3000/api/ussd", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: payParams.toString()
      });
      
      if (!payRes.ok) {
        console.error("Payment initiation failed:", await payRes.text());
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const approveSessionId = "USSD_APPROVE_" + Math.random().toString(36).slice(2, 10).toUpperCase();
      const approveParams = new URLSearchParams();
      approveParams.set("sessionId", approveSessionId);
      approveParams.set("phoneNumber", merchantPhone);
      approveParams.set("text", "3*1");

      const approveRes = await fetch("http://localhost:3000/api/ussd", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: approveParams.toString()
      });

      if (!approveRes.ok) {
        console.error("Merchant approval failed:", await approveRes.text());
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }
      
      console.log(`Loop ${loopCount}: Transaction for KES ${amount} completed.`);
    } catch (err: any) {
      console.error(`Loop ${loopCount} failed with exception:`, err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 10000)); 
  }
  
  console.log("\n======================================================================");
  console.log(`       LOOP TEST COMPLETED. Executed ${loopCount} iterations. `);
  console.log("======================================================================");
}

main().catch(err => {
  console.error("Fatal error:", err);
});
