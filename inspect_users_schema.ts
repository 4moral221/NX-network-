import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function run() {
  const { data: merchants, error: merErr } = await supabase.from('users').select('*').eq('role', 'merchant').limit(2);
  const { data: withPin, error: pinErr } = await supabase.from('users').select('*').not('recovery_pin', 'is', null).limit(2);
  
  if (merErr || pinErr) {
    console.error("Error fetching data:", merErr?.message || pinErr?.message);
  } else {
    console.log("Merchant sample:", JSON.stringify(merchants, null, 2));
    console.log("With recovery PIN sample:", JSON.stringify(withPin, null, 2));
  }
}

run();
