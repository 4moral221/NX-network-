import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const functionUrl = 'https://balrpczytusvzzquzqob.supabase.co/functions/v1/nx-ussd';

const supabase = createClient(url, key);

async function callUssd(phone: string, text: string) {
  const params = new URLSearchParams();
  params.append('phoneNumber', phone);
  params.append('sessionId', 'SIMSESSION_' + Math.floor(Math.random() * 1000000));
  params.append('text', text);

  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'apikey': key
    },
    body: params.toString()
  });

  return await res.text();
}

async function run() {
  const merchantPhone = '254787654321';
  const customerPhone = '254712345678';

  console.log("==================================================");
  console.log("SIMULATING CORE USSD FLOWS ON LIVE SUPABASE EDGE SERVER");
  console.log("==================================================\n");

  // TEST 1: Merchant Main Menu
  console.log("--- TEST 1: Get Merchant Main Menu ---");
  const r1 = await callUssd(merchantPhone, "");
  console.log("Response:\n" + r1 + "\n");

  // TEST 2: Customer Main Menu
  console.log("--- TEST 2: Get Customer Main Menu ---");
  // Customer does not have merchant menu; has normal menu selection
  const r2 = await callUssd(customerPhone, "");
  console.log("Response:\n" + r2 + "\n");

  // TEST 3: Confirm Delivery USSD Flow (Prompt Stage)
  console.log("--- TEST 3: Select Merchant Confirm Delivery (Option 3*4) ---");
  const r3 = await callUssd(merchantPhone, "3*4");
  console.log("Response:\n" + r3 + "\n");

  // TEST 4: Confirm Delivery USSD Flow (Assert Action YES)
  console.log("--- TEST 4: Accept Receipt of Recent Order (Option 3*4*1) ---");
  const r4 = await callUssd(merchantPhone, "3*4*1");
  console.log("Response:\n" + r4 + "\n");

  // TEST 5: Verify DB Status Changed to Delivered
  console.log("--- TEST 5: Verify Restock Status in Supabase ---");
  const { data: records, error } = await supabase
    .from('restock_requests')
    .select('id, status, merchant_code')
    .eq('merchant_phone', merchantPhone);

  if (error) {
    console.error("Failed to query DB:", error.message);
  } else {
    console.log("Current status of restock request record in Database:", records);
  }
}

run();
