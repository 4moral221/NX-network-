
-- ==============================================================================
-- 🛡️ RESTORE AND HARDEN ROW LEVEL SECURITY
-- Re-enables RLS on all public tables and enforces strict privacy boundaries.
-- ==============================================================================

-- 1. RE-ENABLE RLS ON ALL PUBLIC TABLES
DO $$ 
DECLARE 
  r record;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2. RESET POLICIES (DROP ALL TO ENSURE CLEAN STATE)
DO $$ 
DECLARE 
  r record;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. GLOBAL ASSUMPTION: Service Role has full access (Default Supabase behavior)
-- However, we explicitly define it for clarity in some environments.
-- CREATE POLICY "service_role_all" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. USERS TABLE - STRICT PRIVACY
-- Users can see their own data.
-- Admins can see everyone.
-- Hub/Merchant partners can see their sub-merchants.
CREATE POLICY "Users can see their own profile" 
ON public.users FOR SELECT 
USING (
  auth.uid()::text = id OR 
  (SELECT is_admin FROM users WHERE id = auth.uid()::text) = true OR
  hub_merchant_code = (SELECT merchant_code FROM users WHERE id = auth.uid()::text)
);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid()::text = id)
WITH CHECK (
  auth.uid()::text = id AND
  (is_admin = (SELECT is_admin FROM users WHERE id = auth.uid()::text)) AND
  (merchant_code = (SELECT merchant_code FROM users WHERE id = auth.uid()::text))
);

-- 5. LEDGER ENTRIES - NO ONE SEES OTHERS' BALANCES
-- Allow users to see their own ledger, and admins to see all.
CREATE POLICY "Users can see their own ledger" 
ON public.ledger_entries FOR SELECT 
USING (
  auth.uid()::text = user_id OR 
  (SELECT is_admin FROM users WHERE id = auth.uid()::text) = true
);

-- 6. TRANSACTIONS - ONLY INVOLVED PARTIES
CREATE POLICY "Users can see their own transactions" 
ON public.transactions FOR SELECT 
USING (
  auth.uid()::text = (SELECT id FROM users WHERE phone = transactions.customer_phone) OR
  auth.uid()::text = (SELECT id FROM users WHERE merchant_code = transactions.merchant_code) OR
  (SELECT is_admin FROM users WHERE id = auth.uid()::text) = true
);

-- 7. MERCHANT INVENTORY
CREATE POLICY "Merchants can manage their inventory" 
ON public.merchant_inventory FOR ALL 
USING (
  merchant_code = (SELECT merchant_code FROM users WHERE id = auth.uid()::text) OR
  (SELECT is_admin FROM users WHERE id = auth.uid()::text) = true
);

-- 8. ALLOW PUBLIC (ANON) ACCESS FOR LANDING/ONBOARDING IF NECESSARY
-- Based on previous migration, we needed some public access for merchant applications
CREATE POLICY "Public can submit applications" 
ON public.merchant_applications FOR INSERT 
TO anon WITH CHECK (true);

CREATE POLICY "Users can see their own applications" 
ON public.merchant_applications FOR SELECT 
USING (phone = (SELECT phone FROM users WHERE id = auth.uid()::text) OR (SELECT is_admin FROM users WHERE id = auth.uid()::text) = true);

-- 9. FMCG PORTAL ACCESS
-- Ensure FMCG partners can only see their own data or data related to their contributions.
-- (This requires knowing the fmcg_partner_id mapping, which is usually in users table)
CREATE POLICY "FMCG partners see their own config"
ON public.fmcg_partners FOR SELECT
USING (id::text IN (SELECT id::text FROM users WHERE id = auth.uid()::text AND role = 'fmcg'));

-- 10. NX PRODUCTS - PUBLIC CATALOG
CREATE POLICY "Anyone can see products" 
ON public.nx_products FOR SELECT 
TO anon, authenticated USING (true);

-- 11. ADMIN LOGS - ADMIN ONLY
CREATE POLICY "Only admins see logs" 
ON public.nx_logs FOR SELECT 
USING ((SELECT is_admin FROM users WHERE id = auth.uid()::text) = true);

-- 12. REVOKE ALL PRIVILEGES FOR ANON (RESETTING THE DISABLE_RLS MIGRATION)
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Restore standard access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.nx_products TO anon, authenticated;
GRANT INSERT ON public.merchant_applications TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated; -- RLS will filter this.
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
