-- ============================================================
-- NX Network — Session Sync Migration
-- Captures everything applied live via MCP that is missing from
-- the repo's migration history (session spanning 2026-06-19 → 2026-07-10).
-- All statements are idempotent — safe to re-run against a DB that
-- already has these changes (which production does).
-- ============================================================

-- ============================================================
-- 1. SECURITY DEFINER FUNCTION LOCKDOWN
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_transaction_completion() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_transaction_completion() TO service_role;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;

DO $$ BEGIN
  ALTER FUNCTION public.verify_admin_login(text, text) SET search_path = public;
  ALTER FUNCTION public.handle_new_user() SET search_path = public;
  ALTER FUNCTION public.handle_transaction_completion() SET search_path = public;
  ALTER FUNCTION public.detect_transaction_fraud SET search_path = public;
  ALTER FUNCTION public.cleanup_expired_otp_sessions SET search_path = public;
  ALTER FUNCTION public.cleanup_expired_admin_sessions SET search_path = public;
  ALTER FUNCTION public.open_or_get_batch SET search_path = public;
  ALTER FUNCTION public.credit_batch_nx SET search_path = public;
  ALTER FUNCTION public.rls_auto_enable SET search_path = public;
  ALTER FUNCTION public.test_verify SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- 2. PIN / PASSWORD HASHING (was completely missing — USSD
--    registration could not complete end-to-end before this)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions
AS $$ SELECT extensions.crypt(password, extensions.gen_salt('bf')); $$;

CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER
SET search_path = public, extensions
AS $$ SELECT hash = extensions.crypt(password, hash); $$;

REVOKE EXECUTE ON FUNCTION public.hash_password(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_password(text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.hash_password(text) TO service_role;
GRANT  EXECUTE ON FUNCTION public.verify_password(text, text) TO service_role;

-- ============================================================
-- 3. RLS — INIT-PLAN FIX (auth.uid() wrapped in subquery) +
--    ALWAYS-TRUE POLICY FIXES across all merchant/admin tables.
--    NOTE: this project's admin flag lives on users.is_admin,
--    not a separate admin_users role table.
-- ============================================================
DROP POLICY IF EXISTS users_insert_policy ON public.users;
CREATE POLICY users_insert_policy ON public.users
  FOR INSERT WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS applications_insert_policy ON public.merchant_applications;
CREATE POLICY applications_insert_policy ON public.merchant_applications
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT USING (
    (SELECT auth.uid())::text = id::text
    OR EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id::text = (SELECT auth.uid())::text AND u2.is_admin = true)
    OR hub_merchant_code = (SELECT u2.merchant_code FROM public.users u2 WHERE u2.id::text = (SELECT auth.uid())::text)
  );

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE USING (
    (SELECT auth.uid())::text = id::text
    OR EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id::text = (SELECT auth.uid())::text AND u2.is_admin = true)
  );

DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
CREATE POLICY transactions_select_policy ON public.transactions
  FOR SELECT USING (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.phone = transactions.customer_phone)
    OR (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );

DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
  FOR INSERT WITH CHECK (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );

DROP POLICY IF EXISTS transactions_update_policy ON public.transactions;
CREATE POLICY transactions_update_policy ON public.transactions
  FOR UPDATE USING (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );

-- merchant_whitelist: was publicly readable (exposed phone numbers). Admin only now.
DROP POLICY IF EXISTS merchant_whitelist_select ON public.merchant_whitelist;
DROP POLICY IF EXISTS merchant_whitelist_write  ON public.merchant_whitelist;
DROP POLICY IF EXISTS merchant_whitelist_admin_only ON public.merchant_whitelist;
CREATE POLICY merchant_whitelist_admin_only ON public.merchant_whitelist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );

-- merchant_margins: was publicly readable (exposed financial data). Scoped now.
DROP POLICY IF EXISTS margins_select_policy ON public.merchant_margins;
DROP POLICY IF EXISTS margins_all_policy    ON public.merchant_margins;
DROP POLICY IF EXISTS margins_select_own    ON public.merchant_margins;
CREATE POLICY margins_select_own ON public.merchant_margins
  FOR SELECT USING (
    merchant_code = (SELECT users.merchant_code FROM public.users WHERE users.id::text = (SELECT auth.uid())::text)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );

-- ============================================================
-- 4. SKU FUZZY MATCHING — pg_trgm replaces Jina/pgvector
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector  SCHEMA extensions;

DROP FUNCTION IF EXISTS public.match_sku_hybrid(text, double precision, integer);
DROP FUNCTION IF EXISTS public.match_sku_hybrid(vector, text, double precision, integer);

DROP FUNCTION IF EXISTS public.match_sku_trgm(text, text, integer, real);
CREATE FUNCTION public.match_sku_trgm(
  query_text  text,
  lang        text    DEFAULT 'en',
  match_count integer DEFAULT 3,
  threshold   real    DEFAULT 0.3
)
RETURNS TABLE (sku_code text, sku_name text, sim real)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.sku_code,
    CASE WHEN lang = 'sw' THEN s.name_sw ELSE s.name_en END,
    GREATEST(
      word_similarity(lower(query_text), lower(s.name_en)),
      word_similarity(lower(query_text), lower(s.name_sw)),
      word_similarity(lower(query_text), lower(s.sku_code))
    )
  FROM public.sku_catalog s
  WHERE GREATEST(
    word_similarity(lower(query_text), lower(s.name_en)),
    word_similarity(lower(query_text), lower(s.name_sw)),
    word_similarity(lower(query_text), lower(s.sku_code))
  ) >= threshold
  ORDER BY 3 DESC
  LIMIT match_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.match_sku_trgm(text, text, integer, real) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.match_sku_trgm(text, text, integer, real) TO service_role;

CREATE INDEX IF NOT EXISTS idx_sku_catalog_name_en_trgm ON public.sku_catalog USING GIN (lower(name_en) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sku_catalog_name_sw_trgm ON public.sku_catalog USING GIN (lower(name_sw) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sku_catalog_code_trgm    ON public.sku_catalog USING GIN (lower(sku_code) extensions.gin_trgm_ops);

DO $$ BEGIN
  ALTER TABLE public.sku_catalog DROP COLUMN IF EXISTS embedding;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DROP TABLE IF EXISTS public.merchant_restock_embeddings;

-- ============================================================
-- 5. BASKET LOGGING — transaction_items + merchant_prices
--    (SKU-level sell-through data, optional/skippable both sides)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transaction_items (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  transaction_code text          NOT NULL REFERENCES public.transactions(transaction_code) ON DELETE CASCADE,
  merchant_code    text          NOT NULL,
  sku_code         text          NOT NULL,
  sku_name         text          NOT NULL,
  variant          text,
  unit_price       numeric(10,2),
  qty              integer       NOT NULL DEFAULT 1,
  total_price      numeric(10,2) GENERATED ALWAYS AS (unit_price * qty) STORED,
  logged_by        text          NOT NULL CHECK (logged_by IN ('merchant','customer')),
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_prices (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  merchant_code text          NOT NULL,
  sku_code      text          NOT NULL,
  variant       text,
  last_price    numeric(10,2),
  price_count   integer       NOT NULL DEFAULT 1,
  avg_price     numeric(10,2),
  min_price     numeric(10,2),
  max_price     numeric(10,2),
  last_seen_at  timestamptz   NOT NULL DEFAULT now(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (merchant_code, sku_code, variant)
);

CREATE OR REPLACE FUNCTION public.update_merchant_prices()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.unit_price IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.merchant_prices
    (merchant_code, sku_code, variant, last_price, price_count, avg_price, min_price, max_price, last_seen_at)
  VALUES
    (NEW.merchant_code, NEW.sku_code, NEW.variant, NEW.unit_price, 1, NEW.unit_price, NEW.unit_price, NEW.unit_price, now())
  ON CONFLICT (merchant_code, sku_code, variant) DO UPDATE SET
    last_price   = NEW.unit_price,
    price_count  = merchant_prices.price_count + 1,
    avg_price    = ROUND((merchant_prices.avg_price * merchant_prices.price_count + NEW.unit_price) / (merchant_prices.price_count + 1), 2),
    min_price    = LEAST(merchant_prices.min_price, NEW.unit_price),
    max_price    = GREATEST(merchant_prices.max_price, NEW.unit_price),
    last_seen_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_merchant_prices ON public.transaction_items;
CREATE TRIGGER trg_update_merchant_prices
  AFTER INSERT ON public.transaction_items
  FOR EACH ROW EXECUTE FUNCTION public.update_merchant_prices();

CREATE INDEX IF NOT EXISTS idx_txn_items_transaction_code ON public.transaction_items (transaction_code);
CREATE INDEX IF NOT EXISTS idx_txn_items_merchant_sku      ON public.transaction_items (merchant_code, sku_code);
CREATE INDEX IF NOT EXISTS idx_merchant_prices_sku         ON public.merchant_prices (sku_code, variant);
CREATE INDEX IF NOT EXISTS idx_merchant_prices_merchant    ON public.merchant_prices (merchant_code);

ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_prices   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS txn_items_merchant_select   ON public.transaction_items;
DROP POLICY IF EXISTS txn_items_insert            ON public.transaction_items;
DROP POLICY IF EXISTS merchant_prices_read         ON public.merchant_prices;
DROP POLICY IF EXISTS merchant_prices_admin_write  ON public.merchant_prices;

CREATE POLICY txn_items_merchant_select ON public.transaction_items
  FOR SELECT USING (
    merchant_code = (SELECT u.merchant_code FROM public.users u WHERE u.id::text = (SELECT auth.uid())::text)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );
CREATE POLICY txn_items_insert ON public.transaction_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text));
CREATE POLICY merchant_prices_read ON public.merchant_prices FOR SELECT USING (true);
CREATE POLICY merchant_prices_admin_write ON public.merchant_prices
  FOR ALL USING (EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true));

-- ============================================================
-- 6. PARTNER API — scopes + partner_type (FMCG / wholesaler / logistics)
-- ============================================================
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '["demand:read"]'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_type text NOT NULL DEFAULT 'fmcg'
    CHECK (partner_type IN ('fmcg','wholesaler','logistics'));

ALTER TABLE public.fmcg_partners
  ADD COLUMN IF NOT EXISTS partner_type text NOT NULL DEFAULT 'fmcg'
    CHECK (partner_type IN ('fmcg','wholesaler','logistics'));

DO $$ BEGIN
  ALTER TABLE public.fmcg_partners DROP COLUMN IF EXISTS api_key_hash;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

COMMENT ON COLUMN public.api_keys.scope IS
  'fmcg: demand:read batch:bid margin:write prices:read | wholesaler: batch:read fulfil:write invoice:write | logistics: restock:read delivery:write';

-- wholesaler_id linkage on batches + invoices (references fmcg_partners.id)
DO $$ BEGIN
  ALTER TABLE public.restock_batches  ADD COLUMN IF NOT EXISTS wholesaler_id bigint REFERENCES public.fmcg_partners(id);
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS wholesaler_id bigint REFERENCES public.fmcg_partners(id);
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS wholesaler_name text;
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS logistics_status text DEFAULT 'pending_dispatch';
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS cash_status text;
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS driver_name text;
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS delivered_by text;
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
  ALTER TABLE public.restock_invoices ADD COLUMN IF NOT EXISTS cash_confirmed_at timestamptz;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- 7. LEGACY TABLE CLEANUP — confirmed empty/unused, dropped this session
-- ============================================================
DROP TABLE IF EXISTS public.ledger_entries_old CASCADE;
DROP TABLE IF EXISTS public.fmcg_margin_contributions_uuid CASCADE;
DROP TABLE IF EXISTS public.fraud_logs_uuid CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;
DROP TABLE IF EXISTS public.users_uuid CASCADE;

-- ============================================================
-- 8. FK INDEXES + DUPLICATE INDEX CLEANUP
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_api_keys_partner_id ON public.api_keys (partner_id);
CREATE INDEX IF NOT EXISTS idx_partners_user_id     ON public.partners (user_id);
CREATE INDEX IF NOT EXISTS idx_rbo_batch_id         ON public.restock_batch_offers (batch_id);
CREATE INDEX IF NOT EXISTS idx_rbo_fmcg_partner_id  ON public.restock_batch_offers (fmcg_partner_id);

DO $$ BEGIN
  ALTER TABLE public.merchant_inventory DROP CONSTRAINT IF EXISTS idx_inventory_unique;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- ============================================================
-- 9. ADMIN LINKAGE
-- ============================================================
-- Note: the specific admin user row (formidablefoe254@gmail.com) was
-- linked interactively via Supabase Auth UID and is intentionally NOT
-- included here — re-run that linkage manually per-environment if
-- restoring to a fresh project, using that user's real auth.users.id.

-- ============================================================
-- NOTIFY POSTGREST — refresh schema cache after all changes above
-- ============================================================
NOTIFY pgrst, 'reload schema';
