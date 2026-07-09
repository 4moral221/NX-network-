import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: users } = await supabase.from('users').select('merchant_code');
  const { data: margins } = await supabase.from('merchant_margins').select('merchant_code');
  console.log('Users:', users);
  console.log('Margins:', margins);
}

check();
