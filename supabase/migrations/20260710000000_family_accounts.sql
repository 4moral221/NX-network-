-- Create family_accounts table
CREATE TABLE IF NOT EXISTS family_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_phone TEXT NOT NULL,
  family_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'revoked'
  allow_spending BOOLEAN NOT NULL DEFAULT false,
  pinned_merchant_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add family_code and flagging columns to transactions table if not present
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS family_code TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- Enable RLS for family_accounts
ALTER TABLE family_accounts ENABLE ROW LEVEL SECURITY;

-- Disable RLS restrictions for easy sandbox testing (consistent with disable_rls_for_testing migration)
CREATE POLICY "Allow all actions on family_accounts" ON family_accounts FOR ALL USING (true) WITH CHECK (true);
