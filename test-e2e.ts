import { supabaseAdmin } from './src/lib/supabase';
import { merchantFinalise } from './src/services/ussd/db';

async function generateTestPhone() {
  return '254' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

async function runTests() {
  console.log('--- Starting Comprehensive Transactional Tests ---');
  
  // 1. Create a Merchant
  const merchantPhone = await generateTestPhone();
  const merchantCode = 'M' + Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`[Test] Creating Merchant with phone ${merchantPhone} and code ${merchantCode}`);
  
  const merchantData = {
    phone: merchantPhone,
    role: 'merchant',
    merchant_code: merchantCode,
    name: 'Test Merchant',
    language: 'en',
    franchise_tier: 'BASIC',
    status: 'active'
  };

  const { data: merchant, error: mErr } = await supabaseAdmin.from('users').insert(merchantData).select('*').single();
  
  if (mErr) {
    console.error('Failed to create merchant:', mErr);
    return;
  }

  // Duplicate to users_uuid
  const { error: uuMerchantErr } = await supabaseAdmin.from('users_uuid').insert(merchantData);
  if (uuMerchantErr) {
    console.error('❌ Failed to duplicate merchant to users_uuid:', uuMerchantErr);
  } else {
    console.log('✅ Duplicated merchant to users_uuid');
  }
  
  console.log('✅ Merchant Created:', merchant.id);

  // 2. Create a Customer
  const customerPhone = await generateTestPhone();
  console.log(`[Test] Creating Customer with phone ${customerPhone}`);
  
  const customerData = {
    phone: customerPhone,
    role: 'customer',
    name: 'Test Customer',
    language: 'en',
    nx_balance: 50.0, // Give some initial balance
    status: 'active'
  };

  const { data: customer, error: cErr } = await supabaseAdmin.from('users').insert(customerData).select('*').single();
  
  if (cErr) {
    console.error('Failed to create customer:', cErr);
    return;
  }

  // Duplicate to users_uuid
  const { nx_balance, ...uuCustomerData } = customerData;
  const { error: uuCustomerErr } = await supabaseAdmin.from('users_uuid').insert(uuCustomerData);
  if (uuCustomerErr) {
    console.error('❌ Failed to duplicate customer to users_uuid:', uuCustomerErr);
  } else {
    console.log('✅ Duplicated customer to users_uuid');
  }
  
  console.log('✅ Customer Created:', customer.id);
  
  // 3. Initiate Transaction
  console.log('[Test] Creating a transaction scenario');
  
  const { data: txn, error: tErr } = await supabaseAdmin.from('transactions').insert({
    customer_phone: customerPhone,
    merchant_phone: merchantPhone,
    merchant_code: merchantCode,
    amount: 500,
    nx_redeemed: 50,
    nx_earned: 10,
    status: 'awaiting_merchant',
    transaction_code: 'E2E' + Math.floor(10000 + Math.random() * 90000).toString()
  }).select('*').single();
  
  if (tErr) {
    console.error('Failed to create transaction:', tErr);
    return;
  }
  
  console.log('✅ Transaction Created:', txn.id, txn.status);
  
  // 4. Simulate Merchant Approving Transaction
  console.log('[Test] Finalizing transaction via merchantFinalise');
  
  const finalizeSuccess = await merchantFinalise(txn);
  
  if (finalizeSuccess) {
    console.log('✅ Transaction Finalized successfully');
  } else {
    console.error('❌ Failed to finalize transaction');
  }
  
  // 5. Verify the state in the database
  console.log('[Test] Verifying Ledger and Balances');
  
  const { data: updatedTxn } = await supabaseAdmin.from('transactions').select('*').eq('id', txn.id).single();
  console.log('Transaction Status now:', updatedTxn?.status);
  
  const { data: cUser } = await supabaseAdmin.from('users').select('nx_balance').eq('phone', customerPhone).single();
  console.log('Customer NX Balance now:', cUser?.nx_balance, '(Expected: 50 - 50 + 10 = 10)');

  const { data: mUser } = await supabaseAdmin.from('users').select('nx_balance').eq('phone', merchantPhone).single();
  console.log('Merchant NX Balance now:', mUser?.nx_balance, '(Expected: 50)');

  // 6. Test Batch Restock capability
  console.log('[Test] Initiating FCMG Restock Batch creation');
  
  const { data: batchId, error: bErr } = await supabaseAdmin.rpc('open_or_get_batch', {
      p_sku: 'TEST-SKU',
      p_variant: null
  });
  
  if (bErr) {
    console.error('Batch error:', bErr);
  } else {
    console.log('✅ Batch ID retrieved/created:', batchId);
  }
}

runTests().then(() => {
  console.log('Done');
  process.exit(0);
}).catch(console.error);
