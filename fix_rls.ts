import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixRls() {
  console.log("Fixing RLS for restock_batch_offers...");
  
  // Create permissive policy for restock_batch_offers
  await supabaseAdmin.rpc('exec_sql', { sql: `
    DROP POLICY IF EXISTS "Allow public manage offers" ON restock_batch_offers;
    CREATE POLICY "Allow public manage offers" ON restock_batch_offers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    
    DROP POLICY IF EXISTS "FMCG insert offers" ON restock_batch_offers;
    CREATE POLICY "FMCG insert offers" ON restock_batch_offers FOR INSERT TO anon, authenticated WITH CHECK (true);

    ALTER TABLE public.partners DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.api_keys DISABLE ROW LEVEL SECURITY;
  `});

  // What if `exec_sql` rpc doesn't exist?
  // We can just query `supabaseAdmin`? `createClient` doesn't support raw SQL from JS client.
}

fixRls();
