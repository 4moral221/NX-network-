import * as dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = 'balrpczytusvzzquzqob';
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const sql = `
-- 1. Drop problematic foreign keys
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_customer_phone_fkey') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_customer_phone_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_merchant_code_fkey') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_merchant_code_fkey;
    END IF;
END $$;

-- 2. Drop users_uuid
DROP TABLE IF EXISTS users_uuid CASCADE;

-- 3. Add missing columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_purchase_used BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0;

-- 4. Fix fmcg_margin_contributions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fmcg_margin_contributions' AND column_name='fmcg_name') THEN
        ALTER TABLE fmcg_margin_contributions ADD COLUMN fmcg_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fmcg_margin_contributions' AND column_name='sku_code') THEN
        ALTER TABLE fmcg_margin_contributions ADD COLUMN sku_code TEXT;
    END IF;
    -- Make fmcg_name and sku_code not null if possible (need to fill existing data first)
    UPDATE fmcg_margin_contributions SET fmcg_name = 'Legacy' WHERE fmcg_name IS NULL;
    UPDATE fmcg_margin_contributions SET sku_code = 'LEGACY' WHERE sku_code IS NULL;
END $$;

-- 5. Recreate trigger handle_transaction_completion
CREATE OR REPLACE FUNCTION handle_transaction_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status != 'completed' AND NEW.status = 'completed') THEN
    -- Credit customer with earned NX
    IF (NEW.nx_earned > 0) THEN
      INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
      VALUES (
        NEW.customer_phone, 
        'credit', 
        NEW.nx_earned, 
        NEW.transaction_code, 
        now() + interval '2 months'
      );
    END IF;

    -- Debit customer with redeemed NX
    IF (NEW.nx_redeemed > 0) THEN
      INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
      VALUES (
        NEW.customer_phone, 
        'debit', 
        -NEW.nx_redeemed, 
        NEW.transaction_code, 
        now() + interval '2 months'
      );
    END IF;

    -- Update balance on users table
    UPDATE users 
    SET 
      nx_balance = nx_balance + (NEW.nx_earned - NEW.nx_redeemed),
      is_first_purchase_used = true,
      last_transaction_at = now(),
      cancellation_count = 0
    WHERE phone = NEW.customer_phone;

    -- Credit merchant pending payout (or update balance)
    IF (NEW.nx_redeemed > 0) THEN
       INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
       VALUES (
         NEW.merchant_phone,
         'credit',
         NEW.nx_redeemed,
         NEW.transaction_code,
         '2099-12-31'
       );

       UPDATE users 
       SET nx_balance = nx_balance + NEW.nx_redeemed
       WHERE phone = NEW.merchant_phone;
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_transaction_completed ON transactions;
CREATE TRIGGER on_transaction_completed
  AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE handle_transaction_completion();
`;

async function deployFixes() {
  console.log('Deploying database fixes...');
  const res = await fetch('https://api.supabase.com/v1/projects/' + PROJECT_ID + '/database/query', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  const result = await res.json();
  if (res.ok) {
    console.log('✅ Database fixes applied successfully.');
  } else {
    console.error('❌ Error applying fixes:', result);
  }
}

deployFixes().catch(console.error);
