-- Repair ledger_entries schema
BEGIN;

-- 1. Drop the incorrect table
DROP TABLE IF EXISTS ledger_entries;

-- 2. Create it with the correct schema intended by the app logic
CREATE TABLE ledger_entries (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_phone  TEXT NOT NULL,
    entry_type     TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit')),
    amount         NUMERIC(12,2) NOT NULL,
    reference      TEXT,
    expires_at     TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Restore indexes
CREATE INDEX idx_ledger_account_phone ON ledger_entries(account_phone);
CREATE INDEX idx_ledger_expires_at ON ledger_entries(expires_at);

-- 4. Seed system account
INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
VALUES ('NX_SYSTEM', 'credit', 0, 'SYSTEM_INIT', '2099-12-31T00:00:00Z');

-- 5. Fix the broken function in 20260425000000_schema_snapshot.sql (the credit_batch_nx_savings function)
-- We need to find if that function was actually created and fix it too.

COMMIT;
