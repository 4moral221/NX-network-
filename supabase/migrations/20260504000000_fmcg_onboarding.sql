-- FMCG Partner Onboarding Schema

-- 1. Create partners table
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    last4 TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN NOT NULL DEFAULT false
);

-- 3. Enable RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Partners policies
CREATE POLICY "Users can view their own partner profile"
ON public.partners FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own partner profile"
ON public.partners FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own partner profile"
ON public.partners FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- API Keys policies
CREATE POLICY "Users can view their own api keys"
ON public.api_keys FOR SELECT
TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own api keys"
ON public.api_keys FOR INSERT
TO authenticated
WITH CHECK (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own api keys"
ON public.api_keys FOR UPDATE
TO authenticated
USING (partner_id IN (SELECT id FROM public.partners WHERE user_id = auth.uid()));

-- Automatically create partner profile on signup? Not needed, we will do it in frontend immediately after signup.
