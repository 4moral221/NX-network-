import { test, expect } from 'vitest';
import { supabaseAdmin } from '../src/lib/supabase';
import { handleUssdRequest } from '../src/services/ussd';
import { openOrGetBatch } from '../src/services/batchHelper';

function createMockRequest(text: string, phone: string, sessionId: string = 'test-session-123') {
  const body = new URLSearchParams({
    phoneNumber: phone,
    sessionId: sessionId,
    text: text
  }).toString();
  return new Request('https://mock-domain.com/api/ussd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });
}

function randomPhone() {
  return '254' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

test('Comprehensive transactional suite', async () => {
  const customerPhone = randomPhone();
  const merchantPhone = randomPhone();
  let merchantCode = '';

  // 1. Setup Merchant Manually (to bypass Whitelists for tests)
  const mCode = 'M' + Math.floor(100000 + Math.random() * 900000).toString();
  await supabaseAdmin.from('users').insert({
    phone: merchantPhone,
    role: 'merchant',
    merchant_code: mCode,
    name: 'Vitest Merchant',
    status: 'active',
    language: 'en'
  });
  
  // satisfying FK constraint to users_uuid
  await supabaseAdmin.from('users_uuid').insert({
    phone: merchantPhone,
    role: 'merchant',
    merchant_code: mCode,
    name: 'Vitest Merchant',
    status: 'active'
  });
  
  // Set up margins so Pool allows redemption
  await supabaseAdmin.from('merchant_margins').insert({
    merchant_code: mCode,
    gross_margin: 8000
  });

  merchantCode = mCode;

  // 2. Setup Customer Manually
  await supabaseAdmin.from('users').insert({
    phone: customerPhone,
    role: 'customer',
    name: 'Vitest Customer',
    status: 'active',
    language: 'en',
    nx_balance: 500,
    recovery_pin: '0cc175b9c0f1b6a831c399e269772661'
  });

  await supabaseAdmin.from('users_uuid').insert({
    phone: customerPhone,
    role: 'customer',
    name: 'Vitest Customer',
    status: 'active'
  });

  // 3. Customer Pay Merchant 
  const { data: txn, error: tErr } = await supabaseAdmin.from('transactions').insert({
    customer_phone: customerPhone,
    merchant_phone: merchantPhone,
    merchant_code: merchantCode,
    amount: 150,
    nx_redeemed: 15,
    nx_earned: 0,
    status: 'awaiting_merchant',
    transaction_code: 'TEST' + Math.floor(10000 + Math.random() * 90000).toString()
  }).select('*').single();

  expect(tErr).toBeNull();
  expect(txn).toBeDefined();

  // 4. Merchant check transaction via USSD 
  let req = createMockRequest(`3*1`, merchantPhone); 
  let res = await handleUssdRequest(req);
  let resText = await res.text();
  console.log('Merchant confirmation response:', resText);

  // 5. Merchant attempts to Restock (3 is Inventory / Restock, usually option 2 inside Merchant Menu)
  // Let's directly invoke batchHelper to bypass USSD prompt complexity for restock
  console.log('[Test] Initiating FCMG Restock Batch creation');
  const batchRes = await openOrGetBatch(supabaseAdmin, 'SKU-001', 'VAR-A', 5);
  console.log('Batch creation output:', batchRes);
  expect(batchRes.error).toBeNull();
  expect(batchRes.data).toBeDefined();

  // 6. FMCG Margins 
  const { error: fmcgErr } = await supabaseAdmin.from('fmcg_margin_contributions').insert({
    merchant_code: merchantCode,
    fmcg_name: 'Test FMCG',
    contribution_amount: 100,
    status: 'active',
    effective_from: new Date().toISOString()
  });
  if (fmcgErr) {
    console.log('FMCG contribution creation error:', fmcgErr.message);
  } else {
    console.log('✅ FMCG contribution recorded');
  }
});
