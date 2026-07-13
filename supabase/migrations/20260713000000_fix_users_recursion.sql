-- Fix infinite recursion in users table RLS by bypassing check for super admin
DROP POLICY IF EXISTS users_select_policy ON public.users;
CREATE POLICY users_select_policy ON public.users
  FOR SELECT USING (
    id = (SELECT auth.uid())
    OR auth.jwt()->>'email' = 'formidablefoe254@gmail.com'
    OR hub_merchant_code = get_my_merchant_code()
  );

DROP POLICY IF EXISTS users_update_policy ON public.users;
CREATE POLICY users_update_policy ON public.users
  FOR UPDATE USING (
    id = (SELECT auth.uid())
    OR auth.jwt()->>'email' = 'formidablefoe254@gmail.com'
  );
