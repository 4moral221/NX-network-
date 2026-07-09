const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_46131940654bf5b7457a6e6db8bbb36099271fae';

const sql = `
-- Disable Row Level Security on fmcg_margin_contributions
ALTER TABLE public.fmcg_margin_contributions DISABLE ROW LEVEL SECURITY;

-- Fallback permissive policy
DROP POLICY IF EXISTS "Allow auth manage contributions" ON public.fmcg_margin_contributions;
DROP POLICY IF EXISTS "Allow public contributions lookup" ON public.fmcg_margin_contributions;
DROP POLICY IF EXISTS "Allow all manage contributions" ON public.fmcg_margin_contributions;

CREATE POLICY "Allow all manage contributions" ON public.fmcg_margin_contributions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
`;

async function main() {
  console.log("Applying fmcg_margin_contributions RLS fix directly on Supabase via Management API...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('✅ RLS fix executed successfully via Management API!');
    const output = await res.json();
    console.log('Response:', output);
  } else {
    console.error('❌ Error executing RLS fix SQL:', await res.text());
  }
}

main();


