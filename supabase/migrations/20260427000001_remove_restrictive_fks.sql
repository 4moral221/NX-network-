-- Remove restrictive FKs to prevent demo errors where users might be deleted but cached
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_merchant_code_fkey;
