import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.from('users').select('merchant_code, phone, role').eq('role', 'merchant');
  console.log('Merchants:', data);
  if (error) console.error(error);
}

check();
