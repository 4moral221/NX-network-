import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.rpc('verify_admin_login', { p_email: 'test', p_password: 'test' });
  console.log('verify_admin_login:', data, error);
  const { data: d2, error: e2 } = await supabase.rpc('verify_user_login', { p_phone: '254', p_pin: '123' });
  console.log('verify_user_login:', d2, e2);
}

check();
