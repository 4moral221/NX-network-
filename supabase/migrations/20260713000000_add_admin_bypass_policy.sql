-- Allow formidablefoe254@gmail.com to bypass RLS on users table without recursion
DROP POLICY IF EXISTS users_admin_bypass_policy ON public.users;
CREATE POLICY users_admin_bypass_policy ON public.users
  FOR ALL
  USING (auth.jwt()->>'email' = 'formidablefoe254@gmail.com')
  WITH CHECK (auth.jwt()->>'email' = 'formidablefoe254@gmail.com');
