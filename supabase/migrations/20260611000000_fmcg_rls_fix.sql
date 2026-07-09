-- Disable Row Level Security on fmcg_margin_contributions
ALTER TABLE public.fmcg_margin_contributions DISABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies and add highly permissive access policies
DROP POLICY IF EXISTS "Allow auth manage contributions" ON public.fmcg_margin_contributions;
DROP POLICY IF EXISTS "Allow public contributions lookup" ON public.fmcg_margin_contributions;
DROP POLICY IF EXISTS "Allow all manage contributions" ON public.fmcg_margin_contributions;

CREATE POLICY "Allow all manage contributions" ON public.fmcg_margin_contributions
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
