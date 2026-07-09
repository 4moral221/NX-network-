import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
-- 1. ADD MISSING COLUMNS
ALTER TABLE merchant_inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE transactions      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE merchant_margins  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE restock_invoices  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE restock_batches   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. RESET TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ language 'plpgsql';

-- 3. APPLY TRIGGERS (IDEMPOTENT)
DROP TRIGGER IF EXISTS update_merchant_inventory_updated_at ON merchant_inventory;
CREATE TRIGGER update_merchant_inventory_updated_at BEFORE UPDATE ON merchant_inventory 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. FIX CONSTRAINTS
ALTER TABLE merchant_inventory DROP CONSTRAINT IF EXISTS merchant_inventory_merchant_code_sku_code_variant_key;
ALTER TABLE merchant_inventory ADD CONSTRAINT merchant_inventory_merchant_code_sku_code_variant_key UNIQUE (merchant_code, sku_code, variant_code);
`;

async function applyHealSQL() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_ID}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (res.ok) {
    console.log('Legacy Heal SQL applied successfully.');
  } else {
    console.error('Error applying heal SQL:', await res.text());
  }
}
applyHealSQL();
