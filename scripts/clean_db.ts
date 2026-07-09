import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDB() {
  console.log('Cleaning database while retaining admin accounts...');

  const tablesToClear = [
    'fraud_logs',
    'nx_logs',
    'ledger_entries',
    'fmcg_margin_contributions',
    'fmcg_partners',
    'restock_batch_offers',
    'restock_invoices',
    'restock_batches',
    'restock_requests',
    'merchant_applications',
    'merchant_whitelist',
    'hub_commissions',
    'transactions'
  ];

  for (const table of tablesToClear) {
    console.log(`Clearing ${table}...`);
    
    let timeCol = 'created_at';
    if (table === 'merchant_applications') timeCol = 'applied_at';
    else if (table === 'merchant_whitelist') timeCol = 'added_at';
    else if (table === 'restock_requests') timeCol = 'requested_at';
    else if (table === 'restock_batches' || table === 'restock_invoices') timeCol = 'created_at';
    
    const { error } = await supabase.from(table).delete().not(timeCol, 'is', null);
    if (error) {
      console.error(`Error deleting from ${table}:`, error.message);
    } else {
      console.log(`Cleared ${table}`);
    }
  }

  console.log('Clearing non-admin users...');
  const { error: userError } = await supabase.from('users').delete().eq('is_admin', false);
  if (userError) {
    console.error('Error deleting non-admin users:', userError.message);
    
    // Fallback if is_admin eq didn't work well due to nulls
    console.log('Trying alternative delete for users...');
    const { error: err2 } = await supabase.from('users').delete().neq('email', 'formidablefoe254@gmail.com');
    if (err2) console.error(err2.message);
  } else {
    console.log('Cleared non-admin users');
  }

  console.log('Cleaning complete.');
}

cleanDB();
