-- 1. Remove franchise_tier and acceptance_percent from all customer rows
UPDATE public.users 
SET franchise_tier = NULL, acceptance_percent = NULL 
WHERE role = 'customer';

-- 2. Alter column defaults on public.users so they default to NULL instead of 'BASIC' / 0.2
ALTER TABLE public.users ALTER COLUMN franchise_tier DROP DEFAULT;
ALTER TABLE public.users ALTER COLUMN acceptance_percent DROP DEFAULT;

-- 3. Create or replace a database trigger function to enforce that customers never have tier or acceptance_percent
CREATE OR REPLACE FUNCTION public.enforce_customer_no_tier()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role = 'customer' THEN
    NEW.franchise_tier := NULL;
    NEW.acceptance_percent := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_customer_no_tier ON public.users;
CREATE TRIGGER trg_enforce_customer_no_tier
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_customer_no_tier();

-- 4. Re-create / fix RLS functions and policies to prevent permission issues and infinite recursion

CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    (SELECT auth.role()) = 'service_role'
    OR (SELECT auth.jwt()->>'email') IN ('formidablefoe254@gmail.com', 'admin@nxnetwork.com', 'partner@nxnetwork.com')
    OR EXISTS (
      SELECT 1 FROM public.users 
      WHERE id::text = (SELECT auth.uid())::text 
      AND (is_admin = true OR role = 'admin')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_merchant_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT merchant_code FROM public.users
    WHERE id::text = (SELECT auth.uid())::text
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_merchant_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_check() TO public, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_merchant_code() TO public, anon, authenticated, service_role;

-- 5. Harden RLS policies on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT USING (
    id::text = (SELECT auth.uid())::text
    OR is_admin_check()
    OR hub_merchant_code = get_my_merchant_code()
  );

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE USING (
    id::text = (SELECT auth.uid())::text
    OR is_admin_check()
  );

-- 6. Harden RLS policies on transactions table
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
CREATE POLICY transactions_select_policy ON public.transactions
  FOR SELECT USING (
    is_admin_check()
    OR (SELECT auth.uid())::text = (SELECT u.id::text FROM public.users u WHERE u.phone = transactions.customer_phone)
    OR (SELECT auth.uid())::text = (SELECT u.id::text FROM public.users u WHERE u.merchant_code = transactions.merchant_code)
  );

DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
  FOR INSERT WITH CHECK (
    is_admin_check()
    OR (SELECT auth.uid())::text = (SELECT u.id::text FROM public.users u WHERE u.merchant_code = transactions.merchant_code)
  );

DROP POLICY IF EXISTS transactions_update_policy ON public.transactions;
CREATE POLICY transactions_update_policy ON public.transactions
  FOR UPDATE USING (
    is_admin_check()
    OR (SELECT auth.uid())::text = (SELECT u.id::text FROM public.users u WHERE u.merchant_code = transactions.merchant_code)
  );

-- 7. Harden RLS policies on merchant_whitelist
ALTER TABLE public.merchant_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS merchant_whitelist_admin_only ON public.merchant_whitelist;
CREATE POLICY merchant_whitelist_admin_only ON public.merchant_whitelist
  FOR ALL USING (
    is_admin_check()
  );

-- 8. Harden RLS policies on merchant_margins
ALTER TABLE public.merchant_margins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS margins_select_own ON public.merchant_margins;
CREATE POLICY margins_select_own ON public.merchant_margins
  FOR SELECT USING (
    is_admin_check()
    OR merchant_code = get_my_merchant_code()
  );

-- 9. Notify schema reload
NOTIFY pgrst, 'reload schema';
