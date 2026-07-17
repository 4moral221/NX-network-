import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const merchantCode = 'M798253';

  console.log(`Testing transaction for merchant ${merchantCode}...`);

  // 1. Fetch merchant
  const { data: merchant, error: merchErr } = await supabase
    .from('users')
    .select('*')
    .eq('merchant_code', merchantCode)
    .single();

  if (merchErr || !merchant) {
    console.error("Merchant not found:", merchErr?.message);
    process.exit(1);
  }

  console.log("Found Merchant:", merchant.name, merchant.phone, merchant.status);

  // 2. Fetch or Create customer
  console.log("Setting up customer...");
  let customerPhone = '254700000000';
  let { data: cust } = await supabase.from('users').select('*').eq('phone', customerPhone).maybeSingle();
  if (!cust) {
    console.log("Creating dummy customer...");
    await supabase.from('users').insert({
      phone: customerPhone,
      name: 'Dummy Customer',
      role: 'customer',
      status: 'active',
      nx_balance: 1500,
      recovery_pin: '1234'
    });
  } else {
    await supabase.from("users").update({
        status: "active",
        nx_balance: 1500
    }).eq("phone", customerPhone);
  }

  // 3. Initiate payment
  console.log("Customer initiating payment...");
  const paySessionId = "USSD_PAY_SESSION_" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const payParams = new URLSearchParams();
  payParams.set("sessionId", paySessionId);
  payParams.set("phoneNumber", customerPhone);
  payParams.set("text", `3*1*${merchantCode}*100*1`);

  const payRes = await fetch("http://localhost:3000/api/ussd", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payParams.toString()
  });

  const payText = await payRes.text();
  console.log("Customer USSD Response:\n", payText);

  // 4. Verify transaction
  const { data: txList, error: txErr } = await supabase
    .from("transactions")
    .select("*")
    .eq("merchant_phone", merchant.phone)
    .eq("status", "awaiting_merchant")
    .order("created_at", { ascending: false });

  if (txErr || !txList || txList.length === 0) {
    console.error("Failed to fetch pending transaction from live DB:", txErr?.message);
    process.exit(1);
  }

  const pendingTx = txList[0];
  console.log(`\nCreated Live Transaction Details:`);
  console.log(`- ID: ${pendingTx.id}`);
  console.log(`- Amount: ${pendingTx.amount}`);

  // 5. Merchant approves
  console.log("Merchant approving payment...");
  const approveSessionId = "USSD_APPROVE_SESSION_" + Math.random().toString(36).slice(2, 10).toUpperCase();
  const approveParams = new URLSearchParams();
  approveParams.set("sessionId", approveSessionId);
  approveParams.set("phoneNumber", merchant.phone);
  approveParams.set("text", `3*1`);

  const approveRes = await fetch("http://localhost:3000/api/ussd", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: approveParams.toString()
  });

  const approveText = await approveRes.text();
  console.log("Merchant USSD Response:\n", approveText);

  const { data: finalTx } = await supabase.from("transactions").select("*").eq("id", pendingTx.id).single();
  console.log(`- Transaction final status: ${finalTx?.status}`);
  console.log("SUCCESS");
}
main();
