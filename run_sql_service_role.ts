import { createClient } from '@supabase/supabase-js';

const url = 'https://balrpczytusvzzquzqob.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhbHJwY3p5dHVzdnp6cXV6cW9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE1NTAwMywiZXhwIjoyMDg4NzMxMDAzfQ.r8Cxscm0OVRVTFggVYjL-ME5eOd9tHwirY3e9E2wYpY';

const supabase = createClient(url, serviceRoleKey);

const sql = `
-- 1. Ensure last_transaction_at column exists on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;

-- 2. Drop the stale foreign key constraint transactions_customer_phone_fkey
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_phone_fkey CASCADE;

-- 3. Drop transactions_merchant_code_fkey if it's pointing to missing schemas
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_merchant_code_fkey CASCADE;

SELECT 'Schema repair successful!' as result;
`;

async function main() {
  console.log("Connecting with Service Role Key to run DB schema repairs...");
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error("❌ Schema repair via exec_sql failed:", error.message, error);
  } else {
    console.log("✅ SUCCESS! Schema repaired perfectly. Result:", data);
  }
}

main();
