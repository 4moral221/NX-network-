import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
-- 1. EXTEND PARTNERS TABLE WITH ADDITIONAL onboarding COLUMNS
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS whitelisted BOOLEAN DEFAULT false;

-- Sync brand_name with company_name if blank or vice versa
UPDATE public.partners SET company_name = brand_name WHERE company_name IS NULL AND brand_name IS NOT NULL;
UPDATE public.partners SET brand_name = company_name WHERE brand_name IS NULL AND company_name IS NOT NULL;

-- 2. EXTEND API_KEYS TABLE WITH COMPATIBILITY COLUMNS
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS api_key_hash TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- UPDATE api_key_hash with key_hash value for existing keys
UPDATE public.api_keys SET api_key_hash = key_hash WHERE api_key_hash IS NULL AND key_hash IS NOT NULL;

-- 3. CREATE WHITELIST TABLE (For FMCG/Partner auto-approvals based on email/domain)
CREATE TABLE IF NOT EXISTS public.whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    brand_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CREATE ADMIN_APPROVALS TABLE (For non-whitelisted pending registrations)
CREATE TABLE IF NOT EXISTS public.admin_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CREATE AUDIT_LOGS TABLE (Generic audit logger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. DISABLE RLS ON NEW TABLES FOR TESTING compatibility (since previous migration disabled on existing tables)
ALTER TABLE IF EXISTS public.whitelist DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.admin_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 7. GRANT PRIVILEGES TO PUBLIC ACCESS
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Seed some emails in the whitelist for testing
INSERT INTO public.whitelist (email, brand_name, active)
VALUES 
    ('formidablefoe254@gmail.com', 'NX Global HQ', true),
    ('whitelisted@unilever.com', 'Unilever', true),
    ('whitelisted@unilever.co.ke', 'Unilever Kenya', true),
    ('partner@brookside.co.ke', 'Brookside Dairy', true)
ON CONFLICT (email) DO NOTHING;
`;

async function main() {
  if (!TOKEN) {
    console.error("SUPABASE_ACCESS_TOKEN is not defined.");
    process.exit(1);
  }
  
  console.log("Applying FMCG onboarding and API access tables on Supabase...");
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (res.ok) {
    console.log('✅ Onboarding database tables and seed data created successfully!');
    const output = await res.json();
    console.log('Response:', output);
  } else {
    console.error('❌ Error applying onboarding tables:', await res.text());
  }
}

main();
