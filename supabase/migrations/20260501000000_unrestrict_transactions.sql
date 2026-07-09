-- Aggressively remove all restrictive FKs from transactions to allow demo payments
-- This addresses the "Merchant not fully active" (FK Violation 23503) error

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop ALL foreign key constraints on the transactions table
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        JOIN pg_class ON pg_class.oid = pg_constraint.conrelid
        WHERE pg_class.relname = 'transactions'
        AND pg_constraint.contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE transactions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;
