import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.rpc('verify_fmcg_login', { p_brand: 'Taifa', p_password: 'test' });
  console.log('data:', data, 'error:', error);
}

check();
