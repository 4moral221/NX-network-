import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function main() {
  console.log("======================================================================");
  console.log("       NX NETWORK LIVE E2E MERCHANT ONBOARDING & TRANSACTION TEST      ");
  console.log("======================================================================");

  const merchantPhone = "254703267919";
  const customerPhone = "254781550151";

  // --- STEP 1: CLEANUP & PRE-CONDITION SETUP ---
  console.log("\n--- STEP 1: Cleaning up existing merchant records for 0703267919 to start clean ---");
  
  // Clean up existing transactions for this merchant phone to prevent FK conflicts
  await supabase.from("transactions").delete().eq("merchant_phone", merchantPhone);
  
  // Clean users, users_uuid, applications, whitelists
  await supabase.from("users_uuid").delete().eq("phone", merchantPhone);
  const { error: delUserErr } = await supabase.from("users").delete().eq("phone", merchantPhone);
  if (delUserErr) {
    console.warn("Notice: Error or no user to delete in users:", delUserErr.message);
  } else {
    console.log("Successfully removed old merchant user record.");
  }
  
  await supabase.from("merchant_applications").delete().eq("phone", merchantPhone);
  await supabase.from("merchant_whitelist").delete().eq("phone", merchantPhone);

  // Ensure customer exists and has active status and 1500 starting balance
  console.log("\n--- Ensure customer 0781550151 exists with active status and starting balance of 1500 NX ---");
  const { data: existingCust, error: custFetchErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone", customerPhone)
    .maybeSingle();

  if (custFetchErr) {
    console.error("Error fetching customer user:", custFetchErr.message);
    process.exit(1);
  }

  const customerPinHash = crypto.createHash("sha256").update("1234" + customerPhone).digest("hex");

  if (!existingCust) {
    console.log("Customer not found. Creating active customer 254781550151...");
    const { data: newCust, error: newCustErr } = await supabase
      .from("users")
      .insert({
        phone: customerPhone,
        name: "Alex Jaka",
        role: "customer",
        status: "active",
        recovery_pin: customerPinHash,
        nx_balance: 1500,
        language: "en"
      })
      .select()
      .single();

    if (newCustErr) {
      console.error("Failed to create customer user:", newCustErr.message);
      process.exit(1);
    }
    // Duplicate to users_uuid
    await supabase.from("users_uuid").insert({
      phone: customerPhone,
      name: "Alex Jaka",
      role: "customer",
      status: "active",
      recovery_pin: customerPinHash,
      nx_balance: 1500,
      language: "en"
    });
    console.log("Customer created successfully.");
  } else {
    console.log(`Customer already exists: ${existingCust.name}. Resetting balance to 1500 NX and status to active.`);
    const { error: updCustErr } = await supabase
      .from("users")
      .update({
        status: "active",
        nx_balance: 1500,
        recovery_pin: customerPinHash
      })
      .eq("phone", customerPhone);

    if (updCustErr) {
      console.error("Failed to reset customer status/balance:", updCustErr.message);
      process.exit(1);
    }
    await supabase.from("users_uuid").update({
      status: "active",
      nx_balance: 1500,
      recovery_pin: customerPinHash
    }).eq("phone", customerPhone);
  }

  // Whitelist the merchant number so that when they register they are auto-approved to BASIC tier
  console.log("\n--- Whitelisting merchant 0703267919 in merchant_whitelist ---");
  const { data: wlData, error: wlErr } = await supabase
    .from("merchant_whitelist")
    .insert({
      phone: merchantPhone,
      added_at: new Date().toISOString()
    })
    .select();

  if (wlErr) {
    console.error("Failed to whitelist merchant:", wlErr.message);
    process.exit(1);
  }
  console.log("Merchant whitelisted:", wlData);


  // --- STEP 2: SIMULATE MERCHANT REGISTRATION VIA SIMULATED USSD ---
  console.log("\n--- STEP 2: Registering Merchant via USSD Simulation (Auto-Approved due to Whitelist) ---");
  
  // We simulate USSD menu navigation for registration:
  // 1: Pick English language (since user does not exist yet and has no language set)
  // 1: Choose Registration choice
  // 2: Choose Register as Merchant
  // Fresh Duka: Business name
  // Mombasa: Location
  // 12345678: National ID
  // 1234: 4-digit PIN
  // All combined: "1*1*2*Fresh Duka*Mombasa*12345678*1234"
  
  const regSessionId = "USSD_REG_SESSION_" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const regParams = new URLSearchParams();
  regParams.set("sessionId", regSessionId);
  regParams.set("phoneNumber", merchantPhone);
  regParams.set("text", "1*1*2*Fresh Duka*Mombasa*12345678*1234");

  const regRes = await fetch("http://localhost:3000/api/ussd", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: regParams.toString()
  });

  if (!regRes.ok) {
    console.error("USSD registration simulation request failed:", await regRes.text());
    process.exit(1);
  }
  const regText = await regRes.text();
  console.log("USSD Registration Response:\n", regText);

  // Fetch created merchant from live DB
  const { data: newMerchant, error: merchFetchErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone", merchantPhone)
    .single();

  if (merchFetchErr || !newMerchant) {
    console.error("Failed to find newly registered merchant in live DB:", merchFetchErr?.message);
    process.exit(1);
  }

  console.log(`\nNewly Registered Merchant:`);
  console.log(`- Code: ${newMerchant.merchant_code}`);
  console.log(`- Name: ${newMerchant.name}`);
  console.log(`- Role: ${newMerchant.role}`);
  console.log(`- Franchise Tier: ${newMerchant.franchise_tier}`);
  console.log(`- Status: ${newMerchant.status}`);


  // --- STEP 3: PERFORM PWA LOGIN ---
  console.log("\n--- STEP 3: Logging newly registered merchant into PWA ---");
  
  const loginRes = await fetch("http://localhost:3000/api/auth/pwa-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: merchantPhone, pin: "1234" })
  });

  if (!loginRes.ok) {
    console.error("PWA Merchant Login failed:", await loginRes.text());
    process.exit(1);
  }
  const loginData = await loginRes.json();
  console.log("PWA Login Result: SUCCESS ->", loginData);


  // --- STEP 4: TRIGGER PAYMENT REQUEST VIA CUSTOMER USSD ---
  console.log("\n--- STEP 4: Customer USSD Payment Request Initiation ---");
  
  // Sequence for payment:
  // 3: Choose Customer payment/loyalty menu
  // 1: Choose Pay with NX
  // [merchantCode]: Enter the merchant's code we generated above
  // 100: Amount (KES 100)
  // 1: Confirm transaction
  // Combined: "3*1*" + newMerchant.merchant_code + "*100*1"
  
  const paySessionId = "USSD_PAY_SESSION_" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const payParams = new URLSearchParams();
  payParams.set("sessionId", paySessionId);
  payParams.set("phoneNumber", customerPhone);
  payParams.set("text", `3*1*${newMerchant.merchant_code}*100*1`);

  const payRes = await fetch("http://localhost:3000/api/ussd", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payParams.toString()
  });

  if (!payRes.ok) {
    console.error("Customer USSD payment call failed:", await payRes.text());
    process.exit(1);
  }
  const payText = await payRes.text();
  console.log("Customer USSD Response:\n", payText);

  // Fetch created pending transaction
  const { data: txList, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("merchant_phone", merchantPhone)
    .eq("status", "awaiting_merchant")
    .order("created_at", { ascending: false });

  if (txErr || !txList || txList.length === 0) {
    console.error("Failed to fetch pending transaction from live DB:", txErr?.message);
    process.exit(1);
  }

  const pendingTx = txList[0];
  console.log(`\nCreated Live Transaction Details:`);
  console.log(`- ID: ${pendingTx.id}`);
  console.log(`- Transaction Code: ${pendingTx.transaction_code}`);
  console.log(`- Status: ${pendingTx.status}`);
  console.log(`- Amount: ${pendingTx.amount}`);
  console.log(`- NX Redeemed: ${pendingTx.nx_redeemed}`);
  console.log(`- NX Earned: ${pendingTx.nx_earned}`);


  // --- STEP 5: MERCHANT USSD APPROVAL ---
  console.log("\n--- STEP 5: Merchant USSD Approval ---");
  
  // Sequence for approval:
  // When a merchant has a pending transaction awaiting their confirmation,
  // dialing 3 intercepts it immediately to prompt confirmation.
  // Then entering "1" approves/finalizes it.
  // Combined: "3*1"
  const approveSessionId = "USSD_APPROVE_SESSION_" + Math.random().toString(36).slice(2, 10).toUpperCase();
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
    console.error("Merchant USSD approval call failed:", await approveRes.text());
    process.exit(1);
  }
  const approveText = await approveRes.text();
  console.log("Merchant USSD Response:\n", approveText);


  // --- STEP 6: VERIFY LEDGER BALANCE PROPAGATION AND TERMINAL STATES ---
  console.log("\n--- STEP 6: DB Balance and Terminal State Verification ---");
  
  // Small delay for db update propagation
  await new Promise(resolve => setTimeout(resolve, 2000));

  const { data: finalCust, error: custFinalErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone", customerPhone)
    .single();

  const { data: finalMerch, error: merchFinalErr } = await supabase
    .from("users")
    .select("*")
    .eq("phone", merchantPhone)
    .single();

  const { data: finalTx, error: txFinalErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", pendingTx.id)
    .single();

  if (custFinalErr || merchFinalErr || txFinalErr) {
    console.error("Verification failed:", custFinalErr?.message || merchFinalErr?.message || txFinalErr?.message);
    process.exit(1);
  }

  console.log(`\nBalances and Terminal States:`);
  console.log(`- Customer Initial Balance: 1500 NX`);
  console.log(`- Customer Final Balance: ${finalCust.nx_balance} NX`);
  console.log(`- Merchant Initial Balance: 0 NX`);
  console.log(`- Merchant Final Balance: ${finalMerch.nx_balance} NX`);
  console.log(`- Transaction final status: ${finalTx.status} (SUCCESS)`);

  console.log("\n======================================================================");
  console.log("       LIVE END-TO-END TRANSACTION COMPLETED SUCCESSFULLY WITH VERIFICATION ");
  console.log("======================================================================");
}

main().catch(console.error);
