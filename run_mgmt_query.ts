const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error("❌ SUPABASE_ACCESS_TOKEN is missing in environment!");
  process.exit(1);
}

const sql = `
-- 1. Ensure last_transaction_at exists on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;

-- 2. Drop stale constraint that points to deleted users_uuid
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_phone_fkey;

-- 3. Drop stale merchant code constraint if present
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_merchant_code_fkey;

-- 4. In case there is an old transaction completion trigger or function we need to inspect, let's verify users columns
SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users';
`;

async function main() {
  console.log("Repairing schema via Supabase Management API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('✅ Schema repair queries executed successfully!');
    const output = await res.json() as any;
    console.log('QueryResult:', JSON.stringify(output, null, 2));
  } else {
    console.error('❌ Error executing schema repair:', await res.text());
  }
}

main();
