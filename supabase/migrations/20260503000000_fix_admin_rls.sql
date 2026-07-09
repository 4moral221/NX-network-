
-- 🛡️ Fix Admin RLS access to users table
-- The previous policy "Admins have full access" used USING(is_admin = true) 
-- which filtered the rows to ONLY other admins, hiding merchants/customers.

-- 1. Create a security definer function to check admin status without recursion
CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND is_admin = true
  );
END;
$$;

-- 2. Update users table policies
DROP POLICY IF EXISTS "Admins have full access" ON users;
DROP POLICY IF EXISTS "Admins can see all users" ON users;

CREATE POLICY "Admins can see all users" ON users 
FOR SELECT 
TO authenticated 
USING (is_admin_check());

CREATE POLICY "Admins can update all users" ON users 
FOR UPDATE 
TO authenticated 
USING (is_admin_check())
WITH CHECK (is_admin_check());

CREATE POLICY "Admins can delete users" ON users 
FOR DELETE 
TO authenticated 
USING (is_admin_check());

CREATE POLICY "Admins can insert users" ON users 
FOR INSERT 
TO authenticated 
WITH CHECK (is_admin_check());

-- 3. Also allow merchants to see themselves (needed for their own dashboards)
DROP POLICY IF EXISTS "Users can see themselves" ON users;
CREATE POLICY "Users can see themselves" ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 4. Ensure public lookup still works for login
DROP POLICY IF EXISTS "Allow public user lookup" ON users;
CREATE POLICY "Allow public user lookup" ON users 
FOR SELECT 
TO anon, authenticated
USING (status = 'active');
