-- Fix Transaction Schema and Foreign Keys
-- Ensure nx_fee exists and has a default
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS nx_fee NUMERIC DEFAULT 0;

-- Ensure merchant_code indices
CREATE INDEX IF NOT EXISTS txn_merchant_code_idx ON transactions(merchant_code);

-- Fix Foreign Key Constraint
-- We reference users(merchant_code) because that's the primary identity source
-- We use ON UPDATE CASCADE to handle code changes if they ever happen
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_merchant_code_fkey;

ALTER TABLE transactions 
ADD CONSTRAINT transactions_merchant_code_fkey 
FOREIGN KEY (merchant_code) REFERENCES users(merchant_code)
ON UPDATE CASCADE;

-- Also ensure merchant_margins table has the corresponding column if missing
-- although expected to be there from initial_schema
ALTER TABLE merchant_margins 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add a trigger to auto-create merchant_margins when a user becomes a merchant
-- This prevents the "Margin seed failed" scenario in the long run
CREATE OR REPLACE FUNCTION ensure_merchant_margin()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role = 'merchant' AND NEW.merchant_code IS NOT NULL) THEN
    INSERT INTO merchant_margins (merchant_code, gross_margin)
    VALUES (NEW.merchant_code, 0)
    ON CONFLICT (merchant_code) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_ensure_merchant_margin ON users;
CREATE TRIGGER tr_ensure_merchant_margin
AFTER INSERT OR UPDATE OF role, merchant_code ON users
FOR EACH ROW EXECUTE PROCEDURE ensure_merchant_margin();

-- Ensure all current merchants have a margin row
INSERT INTO merchant_margins (merchant_code, gross_margin)
SELECT merchant_code, 0 
FROM users 
WHERE role = 'merchant' AND merchant_code IS NOT NULL
ON CONFLICT (merchant_code) DO NOTHING;
