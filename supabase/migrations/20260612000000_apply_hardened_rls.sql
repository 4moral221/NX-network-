-- ==============================================================================
-- 🛡️ NX NETWORK SYSTEM-WIDE ROW LEVEL SECURITY POLICIES (DYNAMIC & SECURE)
-- Created: 2026-06-12
-- Goal: Harden security across all live, existing core tables.
-- ==============================================================================

-- 1. RE-ENABLE ROW LEVEL SECURITY ON ALL LIVE PUBLIC TABLES DYNAMICALLY
-- This safeguards against unauthenticated write attempts.
DO $$ 
DECLARE 
  r record;
BEGIN
  FOR r IN (
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('delivery_agents', 'delivery_handshakes')
  ) LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- 2. DROP ALL EXISTING EXPLICIT POLICIES ON THESE TABLES DYNAMICALLY
DO $$ 
DECLARE 
  r record;
BEGIN
  FOR r IN (
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename NOT IN ('delivery_agents', 'delivery_handshakes')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 3. DEFINE INDIVIDUAL HARDENED POLICIES WITH SECURE DOUBLE-SIDED TYPE CASTING

-- ==============================================================================
-- [USERS TABLE]
-- ==============================================================================
CREATE POLICY "users_select_policy" ON public.users 
  FOR SELECT 
  USING (
    auth.uid()::text = id::text OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true OR
    hub_merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text)
  );

CREATE POLICY "users_insert_policy" ON public.users 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "users_update_policy" ON public.users 
  FOR UPDATE 
  USING (
    auth.uid()::text = id::text OR 
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [LEDGER ENTRIES Table]
-- ==============================================================================
CREATE POLICY "ledger_select_policy" ON public.ledger_entries 
  FOR SELECT 
  USING (
    account_phone::text = (SELECT phone::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "ledger_insert_policy" ON public.ledger_entries 
  FOR INSERT 
  WITH CHECK (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [TRANSACTIONS Table]
-- ==============================================================================
CREATE POLICY "transactions_select_policy" ON public.transactions 
  FOR SELECT 
  USING (
    auth.uid()::text = (SELECT id::text FROM public.users WHERE phone::text = transactions.customer_phone::text) OR
    auth.uid()::text = (SELECT id::text FROM public.users WHERE merchant_code::text = transactions.merchant_code::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "transactions_insert_policy" ON public.transactions 
  FOR INSERT 
  WITH CHECK (
    auth.uid()::text = (SELECT id::text FROM public.users WHERE merchant_code::text = transactions.merchant_code::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "transactions_update_policy" ON public.transactions 
  FOR UPDATE 
  USING (
    auth.uid()::text = (SELECT id::text FROM public.users WHERE merchant_code::text = transactions.merchant_code::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [MERCHANT INVENTORY Table]
-- ==============================================================================
CREATE POLICY "inventory_all_policy" ON public.merchant_inventory 
  FOR ALL 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [MERCHANT APPLICATIONS Table]
-- ==============================================================================
CREATE POLICY "applications_insert_policy" ON public.merchant_applications 
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "applications_select_policy" ON public.merchant_applications 
  FOR SELECT 
  USING (
    phone::text = (SELECT phone::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "applications_update_policy" ON public.merchant_applications 
  FOR UPDATE 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [FMCG PARTNERS Table]
-- ==============================================================================
CREATE POLICY "fmcg_partners_select" ON public.fmcg_partners 
  FOR SELECT 
  USING (
    name::text IN (SELECT name::text FROM public.users WHERE id::text = auth.uid()::text AND role::text = 'fmcg') OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [NX PRODUCTS & SKU CATALOG (Public Catalogues)]
-- ==============================================================================
CREATE POLICY "nx_products_read" ON public.nx_products 
  FOR SELECT 
  USING (true);

CREATE POLICY "nx_products_write" ON public.nx_products 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "sku_catalog_read" ON public.sku_catalog 
  FOR SELECT 
  USING (true);

CREATE POLICY "sku_catalog_write" ON public.sku_catalog 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [MERCHANT MARGINS & FMCG CONTRIBUTIONS]
-- ==============================================================================
CREATE POLICY "margins_select_policy" ON public.merchant_margins 
  FOR SELECT 
  USING (true);

CREATE POLICY "margins_all_policy" ON public.merchant_margins 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "fmcg_contrib_select_policy" ON public.fmcg_margin_contributions 
  FOR SELECT 
  USING (true);

CREATE POLICY "fmcg_contrib_all_policy" ON public.fmcg_margin_contributions 
  FOR ALL 
  USING (
    fmcg_name::text IN (SELECT name::text FROM public.users WHERE id::text = auth.uid()::text AND role::text = 'fmcg') OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [RESTOCKING WORKFLOWS]
-- ==============================================================================
CREATE POLICY "restock_batches_select" ON public.restock_batches 
  FOR SELECT 
  USING (true);

CREATE POLICY "restock_batches_write" ON public.restock_batches 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "restock_requests_select" ON public.restock_requests 
  FOR SELECT 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "restock_requests_write" ON public.restock_requests 
  FOR ALL 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "restock_invoices_select" ON public.restock_invoices 
  FOR SELECT 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "restock_invoices_write" ON public.restock_invoices 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "restock_offers_select" ON public.restock_batch_offers 
  FOR SELECT 
  USING (true);

CREATE POLICY "restock_offers_write" ON public.restock_batch_offers 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [FINANCIAL & ACCRUAL TRACKING]
-- ==============================================================================
CREATE POLICY "hub_commissions_select" ON public.hub_commissions 
  FOR SELECT 
  USING (
    hub_merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "franchise_fee_select" ON public.franchise_fee_payments 
  FOR SELECT 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [SYSTEM & AUDITING LOGS]
-- ==============================================================================
CREATE POLICY "admin_only_logs" ON public.nx_logs 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "admin_only_ops_logs" ON public.ops_audit_logs 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "admin_only_fraud_logs" ON public.fraud_logs 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [NOTIFICATIONS]
-- ==============================================================================
CREATE POLICY "notifications_select" ON public.merchant_notifications 
  FOR SELECT 
  USING (
    merchant_code::text = (SELECT merchant_code::text FROM public.users WHERE id::text = auth.uid()::text) OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [WHITELISTS & SECURITY CONTROLS]
-- ==============================================================================
CREATE POLICY "merchant_whitelist_select" ON public.merchant_whitelist 
  FOR SELECT 
  USING (true);

CREATE POLICY "merchant_whitelist_write" ON public.merchant_whitelist 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [PARTNERS & API KEYS Table]
-- ==============================================================================
CREATE POLICY "partners_all_policy" ON public.partners 
  FOR ALL 
  USING (
    company_name::text IN (SELECT name::text FROM public.users WHERE id::text = auth.uid()::text AND role::text = 'fmcg') OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "api_keys_all_policy" ON public.api_keys 
  FOR ALL 
  USING (
    partner_id::text IN (SELECT id::text FROM public.users WHERE id::text = auth.uid()::text AND role::text = 'fmcg') OR
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- [ADMIN USERS, SESSIONS & CONTROLS]
-- ==============================================================================
CREATE POLICY "admin_users_all" ON public.admin_users 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "admin_sessions_all" ON public.admin_sessions 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

CREATE POLICY "admin_otp_sessions_all" ON public.admin_otp_sessions 
  FOR ALL 
  USING (
    (SELECT is_admin FROM public.users WHERE id::text = auth.uid()::text) = true
  );

-- ==============================================================================
-- 🔐 RESET PRIVILEGES AFTER UPDATING (Safety Lock)
-- ==============================================================================
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.nx_products TO anon, authenticated;
GRANT SELECT ON public.sku_catalog TO anon, authenticated;
GRANT INSERT ON public.merchant_applications TO anon, authenticated;
GRANT SELECT ON public.merchant_margins TO anon, authenticated;
GRANT SELECT ON public.fmcg_margin_contributions TO anon, authenticated;
GRANT SELECT ON public.restock_batches TO anon, authenticated;
GRANT SELECT ON public.restock_batch_offers TO anon, authenticated;
GRANT SELECT ON public.merchant_whitelist TO anon, authenticated;

-- Authenticated roles get full SELECT/EXECUTE, but they are strictly constrained by Row Level Security policies above.
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
