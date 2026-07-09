import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, key);

const sql = `
-- Disable Row Level Security on api_keys
ALTER TABLE public.api_keys DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policy
DROP POLICY IF EXISTS "api_keys_all_policy" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can create their own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can update their own api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can delete their own api keys" ON public.api_keys;

CREATE POLICY "Allow all manage api_keys" ON public.api_keys
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;

async function run() {
  console.log("Executing api_keys policy SQL via exec_sql RPC...");
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Failed to run query:', error.message, error);
  } else {
    console.log('Query executed successfully! Result:', data);
  }
}

run();
