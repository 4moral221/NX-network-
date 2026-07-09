-- ==============================================================================
-- 🔴 CRITICAL SECURITY FIXES — EXECUTE IMMEDIATELY
-- Addresses all RLS, Security Definer, Index, and Function vulnerabilities.
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY (RLS) ON ALL VULNERABLE TABLES
-- Placed in a DO block to prevent errors if tables don't exist.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'transactions', 'users_uuid', 'merchant_applications', 'fmcg_api_logs',
    'fmcg_sku_margins', 'fmcg_margin_contributions_uuid', 'hub_commissions',
    'franchise_fee_payments', 'merchant_whitelist', 'merchant_margins',
    'merchant_restock_embeddings', 'nx_logs', 'nx_rate_limits', 'sku_catalog',
    'sku_prices', 'admin_users', 'ledger_entries_old', 'visitors',
    'restock_batches', 'nx_products'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS %I ENABLE ROW LEVEL SECURITY', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL; -- Ignore
    END;
  END LOOP;
END $$;

-- 2. DROP PERMISSIVE (TRUE) POLICIES
-- Drop any policy that blindly allows 'anon' or using(true) across standard tables
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'fmcg_partners', 'fmcg_margin_contributions', 'fraud_logs', 'ledger_entries',
    'merchant_inventory', 'merchant_notifications', 'ops_audit_logs',
    'restock_requests', 'restock_invoices', 'users'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Public FMCG Margin Access" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public Users Access" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read for login" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read ledger" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read transactions" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read inventory" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read margins" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public restock requests" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read invoices" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public read applications" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public insert applications" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public manage contributions" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public manage audit" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public manage notifications" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Allow public manage fraud" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Public phone lookup" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Secure ledger access" ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins only write" ON %I;', t);
  END LOOP;
END $$;

-- 3. ESTABLISH SECURE POLICIES
-- Only allow authenticated users or service_role to access sensitive data.
-- (Note: If using custom auth without Supabase Auth, you MUST migrate to Supabase Auth
-- or use Edge Functions exclusively. Exposing 'anon' via API is not secure).

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users', 'ledger_entries', 'transactions', 'merchant_margins',
    'merchant_inventory', 'restock_requests', 'restock_invoices',
    'fmcg_margin_contributions', 'sku_catalog', 'merchant_whitelist',
    'merchant_applications', 'hub_commissions', 'nx_rate_limits',
    'nx_logs', 'fmcg_partners', 'franchise_fee_payments', 'ops_audit_logs',
    'merchant_notifications', 'fraud_logs', 'restock_batches', 'nx_products'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop overlap if any
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_access" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', t);
    
    -- Recreate strict policies
    BEGIN
      EXECUTE format('CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t);
      -- NOTE: The following assumes application will adopt Supabase Auth JWTs mapping the user
      -- For read-only public catalogs without PII, separate policies are needed.
      -- EXECUTE format('CREATE POLICY "authenticated_access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Enable ANON read ONLY for completely public catalogs (No PII)
CREATE POLICY "Anon read sku_catalog" ON sku_catalog FOR SELECT TO anon USING (true);
CREATE POLICY "Anon read nx_products" ON nx_products FOR SELECT TO anon USING (true);


-- 4. FIX SECURITY DEFINER VIEWS (Must be SECURITY INVOKER to respect RLS)
-- Since confirmed_transactions and v_pool_health bypassed RLS, we drop and recreate them 
-- as standard views (which default to security invoker in PG <= 14, and in 15+ we can explicitly set unless it's standard).
-- We'll just alter them to security invoker if they were specifically altered, but by default views are security invoker unless defined with security barrier or auth check.
ALTER VIEW audit_balance_drift SET (security_invoker = true);
ALTER VIEW v_merchant_stats SET (security_invoker = true);
-- Apply to confirmed_transactions / v_pool_health if they exist
DO $$ BEGIN
  EXECUTE 'ALTER VIEW confirmed_transactions SET (security_invoker = true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER VIEW v_pool_health SET (security_invoker = true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;


-- 5. HASH fmcg_partners.api_key
-- We rename API key, make a hash column, to prevent plaintext DB leaking.
ALTER TABLE fmcg_partners ADD COLUMN IF NOT EXISTS api_key_hash text;
UPDATE fmcg_partners SET api_key_hash = encode(digest(api_key, 'sha256'), 'hex') WHERE api_key IS NOT NULL AND api_key_hash IS NULL;
-- (Application must be updated to compare hashes instead of plaintext)
-- NOTE: Leaving the old column for backward compatibility for 1 week, but you MUST drop it:
-- ALTER TABLE fmcg_partners DROP COLUMN api_key;


-- 6. ADD MISSING INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS fmcg_api_logs_fmcg_id_idx ON fmcg_api_logs(fmcg_id);
CREATE INDEX IF NOT EXISTS fmcg_margin_contr_uuid_idx ON fmcg_margin_contributions_uuid(fmcg_id, sku_code);
CREATE INDEX IF NOT EXISTS fmcg_sku_margins_sku_idx ON fmcg_sku_margins(sku_code);
CREATE INDEX IF NOT EXISTS restock_batch_offers_comp_idx ON restock_batch_offers(batch_id, fmcg_partner_id);
CREATE INDEX IF NOT EXISTS restock_inv_req_idx ON restock_invoices(restock_request_id);
CREATE INDEX IF NOT EXISTS restock_req_batch_idx ON restock_requests(batch_id);


-- 7. LOCK DOWN LEGACY TABLE
ALTER TABLE IF EXISTS ledger_entries_old ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Access" ON ledger_entries_old;
-- or DROP TABLE IF EXISTS ledger_entries_old CASCADE; (Left locked but not dropped for safety)


-- 8. MOVE VECTOR / TRGM EXTENSIONS TO EXCLUSIVE SCHEMA
CREATE SCHEMA IF NOT EXISTS extensions;
-- Warning: Altering extension schema can require superuser depending on the PG environment.
-- ALTER EXTENSION vector SET SCHEMA extensions;
-- ALTER EXTENSION pg_trgm SET SCHEMA extensions;


-- 9. FIX SEARCH_PATH VULNERABILITY IN ALL IDENTIFIED FUNCTIONS
-- This applies `SET search_path = public` inside the function definition
-- preventing attackers from overriding search_path in the session and hijacking function calls.
DO $$ 
DECLARE 
  f record;
  target_funcs text[] := ARRAY[
    'is_admin', 'enforce_tier_compliance', 'open_or_get_batch',
    'detect_transaction_fraud', 'match_sku_hybrid', 'match_sku',
    'confirm_delivery', 'confirm_cash_received', 'inject_pool_on_invoice_create',
    'refresh_batch_totals', 'reset_pool_cycle', 'generate_monthly_fees',
    'auto_fee_on_tier_upgrade', 'payout_hub_commissions', 'get_expiring_nx',
    'get_nx_system_balance', 'get_cycle_stats', 'get_merchant_cycle_stats',
    'copy_confirmed_txns', 'inject_pool_on_invoice_settle', 'mark_fee_paid',
    'reset_suspension', 'auto_create_invoice_on_fulfill',
    'recompute_margin_on_invoice_edit', 'update_updated_at_column',
    'touch_updated_at', 'get_merchant_pool', 'verify_admin_login', 'credit_batch_nx'
  ];
BEGIN
  FOR f IN 
    SELECT p.oid::regprocedure as proc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = ANY(target_funcs)
  LOOP
    EXECUTE 'ALTER FUNCTION ' || f.proc || ' SET search_path = public';
  END LOOP;
END $$;
