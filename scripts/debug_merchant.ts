import { supabase } from '../src/lib/supabase';

async function checkMerchant() {
  const mCode = 'M648420';
  console.log(`Checking status for merchant ${mCode}...`);

  const { data: user, error: uErr } = await supabase
    .from('users')
    .select('*')
    .eq('merchant_code', mCode)
    .maybeSingle();

  if (uErr) {
    console.error('Error fetching user:', uErr);
  } else if (!user) {
    console.warn(`Merchant ${mCode} NOT FOUND in users table.`);
  } else {
    console.log(`User found:`, { phone: user.phone, role: user.role, status: user.status });
  }

  const { data: margins, error: mErr } = await supabase
    .from('merchant_margins')
    .select('*')
    .eq('merchant_code', mCode)
    .maybeSingle();

  if (mErr) {
    console.error('Error fetching margins:', mErr);
  } else if (!margins) {
    console.warn(`Merchant ${mCode} NOT FOUND in merchant_margins table.`);
  } else {
    console.log(`Margins found:`, margins);
  }

  const { data: logs, error: lErr } = await supabase
    .from('nx_logs')
    .select('*')
    .ilike('context', `%${mCode}%`)
    .limit(5);

  if (!lErr && logs?.length) {
    console.log(`Recent error logs for ${mCode}:`, logs);
  }

  const { data: txns, error: tErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('merchant_code', mCode)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!tErr) {
    console.log(`Recent transactions for ${mCode}:`, txns);
  }
}

checkMerchant();
