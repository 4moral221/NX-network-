
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function checkMerchants() {
  const { data, error } = await supabase.from('users').select('*').eq('role', 'merchant');
  if (error) {
    console.error('Error fetching merchants:', error);
    return;
  }
  console.log('Merchants:', data);
  
  const { data: drift, error: driftErr } = await supabase.from('audit_balance_drift').select('*');
  if (driftErr) console.error('Drift Error:', driftErr);
  console.log('Audit Drift:', drift);

  const { data: mStats, error: mStatsErr } = await supabase.from('v_merchant_stats').select('*');
  if (mStatsErr) console.error('MStats Error:', mStatsErr);
  console.log('Merchant Stats:', mStats);

  const { data: wavesTxns } = await supabase.from('transactions').select('*').eq('merchant_code', 'M804225');
  console.log('Waves Shop Transactions:', wavesTxns);

  const { data: wavesMargins } = await supabase.from('merchant_margins').select('*').eq('merchant_code', 'M804225');
  console.log('Waves Shop Margins:', wavesMargins);
}

checkMerchants();
