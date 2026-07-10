import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.rpc("hash_password", { password: "0000" });
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Hash result for 0000:", data);
  }
}

check();
