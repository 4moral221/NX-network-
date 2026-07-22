import { test, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { handleUssdRequest } from '../src/services/ussd';
import { openOrGetBatch } from '../src/services/batchHelper';
import { mockSupabase } from '../src/lib/supabase';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://balrpczytusvzzquzqob.supabase.co';
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || 'mock-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

function createMockRequest(text: string, phone: string, sessionId: string = 'DEMO-test-123') {
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
  const merchantObj = {
    phone: merchantPhone,
    role: 'merchant',
    merchant_code: mCode,
    name: 'Vitest Merchant',
    status: 'active',
    language: 'en',
    recovery_pin: '1234'
  };
  await supabaseAdmin.from('users').insert(merchantObj);
  await mockSupabase.from('users').insert(merchantObj);
  
  // satisfying FK constraint to users_uuid
  await supabaseAdmin.from('users_uuid').insert({
    phone: merchantPhone,
    role: 'merchant',
    merchant_code: mCode,
    name: 'Vitest Merchant',
    status: 'active'
  });
  
  // Set up margins so Pool allows redemption
  const marginObj = {
    merchant_code: mCode,
    gross_margin: 8000
  };
  await supabaseAdmin.from('merchant_margins').insert(marginObj);
  await mockSupabase.from('merchant_margins').insert(marginObj);

  merchantCode = mCode;

  // 2. Setup Customer Manually
  const customerObj = {
    phone: customerPhone,
    role: 'customer',
    name: 'Vitest Customer',
    status: 'active',
    language: 'en',
    nx_balance: 500,
    recovery_pin: '0cc175b9c0f1b6a831c399e269772661'
  };
  await supabaseAdmin.from('users').insert(customerObj);
  await mockSupabase.from('users').insert(customerObj);

  await supabaseAdmin.from('users_uuid').insert({
    phone: customerPhone,
    role: 'customer',
    name: 'Vitest Customer',
    status: 'active'
  });

  // 3. Customer Pay Merchant 
  const txnObj = {
    customer_phone: customerPhone,
    merchant_phone: merchantPhone,
    merchant_code: merchantCode,
    amount: 150,
    nx_redeemed: 15,
    nx_earned: 0,
    status: 'awaiting_merchant',
    transaction_code: 'TEST' + Math.floor(10000 + Math.random() * 90000).toString()
  };
  const { data: txn, error: tErr } = await supabaseAdmin.from('transactions').insert(txnObj).select('*').single();
  await mockSupabase.from('transactions').insert(txnObj);

  expect(tErr).toBeNull();
  expect(txn).toBeDefined();

  // 4. Merchant check transaction via USSD 
  let req = createMockRequest(`3*1234`, merchantPhone); 
  let res = await handleUssdRequest(req);
  let resText = await res.text();
  expect(resText).toContain('Pending payment');

  let reqApprove = createMockRequest(`3*1234*1`, merchantPhone); 
  let resApprove = await handleUssdRequest(reqApprove);
  let resApproveText = await resApprove.text();
  console.log('Merchant confirmation response:', resApproveText);
  expect(resApproveText).toContain('Log items sold');

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
