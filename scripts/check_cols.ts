import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.from('users').select('dashboard_password').limit(1);
  console.log('users.dashboard_password:', data, error);
  const { data: d2, error: e2 } = await supabase.from('fmcg_partners').select('api_key_hash').limit(1);
  console.log('fmcg_partners.api_key_hash:', d2, e2);
}

check();
