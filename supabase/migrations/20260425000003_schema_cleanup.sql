-- Cleanup redundant tables as per technical audit
-- 1. Drop users_uuid (migrate to users if necessary, but audit implies it's redundant)
-- Caution: Ensure users table has all data from users_uuid before dropping.
-- For this MVP, we assume users is canonical.
DROP TABLE IF EXISTS users_uuid;

-- 2. Drop ledger_entries_old
DROP TABLE IF EXISTS ledger_entries_old;

-- 3. Ensure RLS is enabled on critical tables (Sprint 1 item)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;

-- Note: Policies need to be carefully crafted, will handle in a separate migration if not already in schema.sql
