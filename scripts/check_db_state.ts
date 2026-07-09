import { supabaseAdmin } from '../src/lib/supabase';

async function checkSchema() {
  console.log('--- Checking Schema ---');
  
  // 1. Check users columns
  const { data: usersData, error: uErr } = await supabaseAdmin
    .from('users')
    .select('*')
    .limit(1);
    
  if (uErr) {
    console.error('Error fetching users:', uErr);
  } else {
    const columns = Object.keys(usersData?.[0] || {});
    console.log('Users columns:', columns);
    console.log('Has last_transaction_at?', columns.includes('last_transaction_at'));
  }

  // 2. Check if users_uuid exists
  console.log('SUPABASE_ACCESS_TOKEN exists?', !!process.env.SUPABASE_ACCESS_TOKEN);
  
  const { error: uuErr } = await supabaseAdmin
    .from('users_uuid')
    .select('*')
    .limit(1);
    
  if (uuErr) {
    console.log('users_uuid table error (expected if dropped):', uuErr.message);
  } else {
    console.log('users_uuid table STILL EXISTS');
  }

  // 3. Check transactions FKs (can't directly via Supabase SDK easily without RPC, but we can try an insert)
}

checkSchema().catch(console.error);
