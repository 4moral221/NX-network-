import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY! // Note: ANON key
);

async function check() {
  const { data, error } = await supabase.from('users').select('recovery_pin, dashboard_password').limit(1);
  console.log('Anon read sensitive cols:', data, error);
}

check();
