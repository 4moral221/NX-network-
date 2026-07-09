
-- ==============================================================================
-- 🔓 DISABLE RLS FOR TESTING (Temporary Diagnostics)
-- ==============================================================================

DO $$ 
DECLARE 
  r record;
BEGIN
  -- Disable RLS on all tables in public schema to allow unrestricted testing
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
    
    -- Also drop policies to be clean, though disabling RLS makes them inactive
    -- EXECUTE format('DROP POLICY IF EXISTS "service_role_complete_access" ON public.%I', r.tablename);
  END LOOP;
END $$;

-- Also grant full usage to anon and authenticated temporarily if needed, 
-- though RLS being disabled already allows most access if grants exist.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
