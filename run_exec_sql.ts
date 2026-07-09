import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

async function run() {
  console.log("Reading delivery agents migration SQL...");
  const sql = fs.readFileSync('supabase/migrations/20260531000000_agents_and_delivery_handshake.sql', 'utf8');

  console.log("Executing via exec_sql RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Failed to run migration:', error.message, error);
  } else {
    console.log('Migration executed successfully! Result data:', data);
  }
}

run();
