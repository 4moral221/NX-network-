-- 🛡️ Fix users RLS policy recursion & infinite loops

-- 1. Create or replace security definer functions to prevent infinite recursion
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND is_admin = true
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
    WHERE id = auth.uid()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin_check() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_merchant_code() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.is_admin_check() TO authenticated, service_role;
GRANT  EXECUTE ON FUNCTION public.get_my_merchant_code() TO authenticated, service_role;

-- 2. Drop and recreate users table policies
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR is_admin_check()
    OR hub_merchant_code = get_my_merchant_code()
  );

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE USING (
    id = (SELECT auth.uid())
    OR is_admin_check()
  );

-- 3. Drop and recreate transactions policies
DROP POLICY IF EXISTS transactions_select_policy ON public.transactions;
CREATE POLICY transactions_select_policy ON public.transactions
  FOR SELECT USING (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.phone = transactions.customer_phone)
    OR (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR is_admin_check()
  );

DROP POLICY IF EXISTS transactions_insert_policy ON public.transactions;
CREATE POLICY transactions_insert_policy ON public.transactions
  FOR INSERT WITH CHECK (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR is_admin_check()
  );

DROP POLICY IF EXISTS transactions_update_policy ON public.transactions;
CREATE POLICY transactions_update_policy ON public.transactions
  FOR UPDATE USING (
    (SELECT auth.uid())::text = (SELECT users.id::text FROM public.users WHERE users.merchant_code = transactions.merchant_code)
    OR is_admin_check()
  );

-- 4. Drop and recreate merchant whitelist policies
DROP POLICY IF EXISTS merchant_whitelist_admin_only ON public.merchant_whitelist;
CREATE POLICY merchant_whitelist_admin_only ON public.merchant_whitelist
  FOR ALL USING (
    is_admin_check()
  );

-- 5. Drop and recreate merchant margins policies
DROP POLICY IF EXISTS margins_select_own ON public.merchant_margins;
CREATE POLICY margins_select_own ON public.merchant_margins
  FOR SELECT USING (
    merchant_code = (SELECT users.merchant_code FROM public.users WHERE users.id::text = (SELECT auth.uid())::text)
    OR is_admin_check()
  );

-- 6. Drop and recreate transaction items policies
DROP POLICY IF EXISTS txn_items_merchant_select ON public.transaction_items;
CREATE POLICY txn_items_merchant_select ON public.transaction_items
  FOR SELECT USING (
    merchant_code = (SELECT u.merchant_code FROM public.users u WHERE u.id::text = (SELECT auth.uid())::text)
    OR is_admin_check()
  );

-- 7. Drop and recreate merchant prices policies
DROP POLICY IF EXISTS merchant_prices_admin_write ON public.merchant_prices;
CREATE POLICY merchant_prices_admin_write ON public.merchant_prices
  FOR ALL USING (is_admin_check());
