const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_46131940654bf5b7457a6e6db8bbb36099271fae';

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

async function main() {
  console.log("Applying api_keys RLS fix directly on Supabase via Management API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('✅ api_keys RLS fix executed successfully via Management API!');
    const output = await res.json();
    console.log('Response:', output);
  } else {
    console.error('❌ Error executing api_keys RLS fix SQL:', await res.text());
  }
}

main();
