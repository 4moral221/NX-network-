
-- Final Schema Fix & Data Restoration
-- This migration ensures relational integrity and restores enough test data for the demo.

-- 1. Ensure users.merchant_code is unique (required for FK)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_merchant_code_key;
ALTER TABLE users ADD CONSTRAINT users_merchant_code_key UNIQUE (merchant_code);

-- 2. Repair Transactions FK
-- If it was pointing to the wrong table or had the wrong name, we fix it here.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_merchant_code_fkey;
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_merchant_code_fkey 
  FOREIGN KEY (merchant_code) 
  REFERENCES users(merchant_code)
  ON DELETE CASCADE;

-- 3. Restore Merchant Margins for all existing merchants
-- (Prevents the "Merchant not active" error in CustomerDashboard)
INSERT INTO merchant_margins (merchant_code, gross_margin)
SELECT merchant_code, 50000.00 -- Seed with some healthy margin for demo
FROM users
WHERE merchant_code IS NOT NULL
ON CONFLICT (merchant_code) DO UPDATE 
SET gross_margin = EXCLUDED.gross_margin;

-- 4. Seed more test merchants to fill the "Nearby" list
-- These will serve as valid targets for the Customer PWA
INSERT INTO users (phone, name, role, merchant_code, franchise_tier, location, status)
VALUES 
  ('254711111111', 'Mama Watene Shop', 'merchant', 'M613794', 'BASIC', 'Mombasa West', 'active'),
  ('254722222222', 'Kijiji Mini-Mart', 'merchant', 'M804225', 'CERTIFIED', 'South B', 'active'),
  ('254733333333', 'Central Hub Stores', 'merchant', 'M-HUB-1', 'HUB', 'Industrial Area', 'active')
ON CONFLICT (phone) DO UPDATE 
SET 
  merchant_code = EXCLUDED.merchant_code,
  role = EXCLUDED.role,
  status = EXCLUDED.status;

-- 5. Seed margins for the new merchants
INSERT INTO merchant_margins (merchant_code, gross_margin)
VALUES 
  ('M613794', 75000.00),
  ('M804225', 120000.00),
  ('M-HUB-1', 500000.00)
ON CONFLICT (merchant_code) DO NOTHING;

-- 6. Ensure inventory rows exist so they don't look "Empty"
INSERT INTO merchant_inventory (merchant_code, sku_code, variant_code, quantity)
SELECT u.merchant_code, 'BR', '400g', 50 FROM users u WHERE u.role = 'merchant' AND u.merchant_code IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO merchant_inventory (merchant_code, sku_code, variant_code, quantity)
SELECT u.merchant_code, 'ML', '500ml', 100 FROM users u WHERE u.role = 'merchant' AND u.merchant_code IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. Fix super-admin code
UPDATE users SET merchant_code = 'M-ADMIN' WHERE is_admin = true AND merchant_code IS NULL;
