import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function run() {
  const customerPhone = '254712345678';
  const customerPin = '1234';
  const customerPnPinHash = sha256(customerPin + customerPhone);

  const merchantPhone = '254787654321';
  const merchantPin = '1234';
  const merchantPnPinHash = sha256(merchantPin + merchantPhone);

  console.log("Customer phone pin hash:", customerPnPinHash);
  console.log("Merchant phone pin hash:", merchantPnPinHash);

  // Clean up any old test records
  console.log("Cleaning up old test data...");
  const { error: rrDelErr } = await supabase
    .from('restock_requests')
    .delete()
    .eq('merchant_phone', merchantPhone);
  if (rrDelErr) console.warn("Restock requests cleanup warn:", rrDelErr.message);

  const { error: uDelErr } = await supabase
    .from('users')
    .delete()
    .in('phone', [customerPhone, merchantPhone]);
  if (uDelErr) console.warn("Users cleanup warn:", uDelErr.message);

  // 1. Insert Customer User
  console.log("Inserting Customer 'Juma Customer'...");
  const { data: custData, error: custErr } = await supabase
    .from('users')
    .insert({
      id: 'a1100000-0000-0000-0000-000000000001',
      phone: customerPhone,
      name: 'Juma Customer',
      role: 'customer',
      status: 'active',
      franchise_tier: 'BASIC',
      language: 'en',
      nx_balance: 1500,
      recovery_pin: customerPnPinHash,
      is_admin: false
    })
    .select();

  if (custErr) {
    console.error("Failed to insert customer user:", custErr.message);
  } else {
    console.log("Customer registered successfully:", custData);
  }

  // 2. Insert Merchant User
  console.log("Inserting Merchant 'Simba Kiosk'...");
  const { data: merData, error: merErr } = await supabase
    .from('users')
    .insert({
      id: 'a2200000-0000-0000-0000-000000000002',
      phone: merchantPhone,
      name: 'Simba Kiosk',
      role: 'merchant',
      status: 'active',
      franchise_tier: 'BASIC',
      language: 'en',
      nx_balance: 5000,
      recovery_pin: merchantPnPinHash,
      merchant_code: 'M123456',
      acceptance_percent: 0.20,
      location: 'Nairobi Central',
      is_admin: false
    })
    .select();

  if (merErr) {
    console.error("Failed to insert merchant user:", merErr.message);
  } else {
    console.log("Merchant registered successfully:", merData);
  }

  // 3. Insert a pending restock request for testing the USSD choice
  console.log("Inserting pending restock shipment request...");
  const { data: rrData, error: rrErr } = await supabase
    .from('restock_requests')
    .insert({
      merchant_code: 'M123456',
      merchant_phone: merchantPhone,
      sku_code: 'BR',
      sku_name: 'SupaLoaf',
      quantity: 10,
      raw_input: 'BR*10,ML*5',
      status: 'pending' // Can also be 'dispatched' or 'approved'
    })
    .select();

  if (rrErr) {
    console.error("Failed to insert restock request:", rrErr.message);
  } else {
    console.log("Pending restock request registered successfully:", rrData);
  }
}

run();
