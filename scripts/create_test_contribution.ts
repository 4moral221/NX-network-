
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || 'https://balrpczytusvzzquzqob.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!key) {
  console.error('Environment variables VITE_SUPABASE_ANON_KEY is missing.');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Fetching merchant and partner for test contribution...');
  
  const { data: merchants } = await supabase.from('merchants').select('merchant_code').limit(1);
  const { data: partners } = await supabase.from('fmcg_partners').select('name').limit(1);
  
  if (!merchants?.length) {
    console.warn('No merchants found. Using placeholder M1001.');
  }
  
  if (!partners?.length) {
    console.warn('No partners found. Using placeholder Brookside.');
  }

  const mCode = 'M804225';
  const brand = 'Brookside Dairy';

  console.log(`Action: Creating contribution from "${brand}" to merchant "${mCode}"...`);

  const { data, error } = await supabase.from('fmcg_margin_contributions').insert({
    merchant_code: mCode,
    fmcg_name: brand,
    contribution_amount: 2500,
    effective_from: new Date().toISOString().slice(0, 10),
    status: 'pending'
  }).select();

  if (error) {
    console.error('Failed to create contribution:', error.message);
  } else {
    console.log('✅ Success! Contribution created with status: PENDING');
    console.log('Data:', data[0]);
  }
}

run();
