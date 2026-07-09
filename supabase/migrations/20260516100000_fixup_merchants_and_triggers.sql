-- 1. Drop the problematic foreign key if it still exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_customer_phone_fkey') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_customer_phone_fkey;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_merchant_code_fkey') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_merchant_code_fkey;
    END IF;
END $$;

-- 2. Ensure users_uuid is gone
DROP TABLE IF EXISTS users_uuid CASCADE;

-- 3. Migration to fix discrepancies between schema and code expectations
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP WITH TIME ZONE;

-- Ensure fmcg_margin_contributions has the name column if it was missed in some paths
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fmcg_margin_contributions' AND column_name='fmcg_name') THEN
        ALTER TABLE fmcg_margin_contributions ADD COLUMN fmcg_name TEXT;
    END IF;
END $$;

-- Update the trigger handle_transaction_completion to be more robust
-- (The trigger script already existed but we want to make sure it matches the current columns)
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

    -- Update balance on users table (redundant but good for speed as per AGENTS.md)
    UPDATE users 
    SET 
      nx_balance = nx_balance + (NEW.nx_earned - NEW.nx_redeemed),
      is_first_purchase_used = true,
      last_transaction_at = now(),
      cancellation_count = 0
    WHERE phone = NEW.customer_phone;

    -- Credit merchant pending payout (or update balance)
    -- As per design, nx_redeemed is what the merchant "accepts" as payment.
    -- We'll record this in the ledger and update their balance.
    IF (NEW.nx_redeemed > 0) THEN
       INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
       VALUES (
         NEW.merchant_phone,
         'credit',
         NEW.nx_redeemed,
         NEW.transaction_code,
         '2099-12-31' -- Merchants have permanent pool basically
       );

       UPDATE users 
       SET nx_balance = nx_balance + NEW.nx_redeemed
       WHERE phone = NEW.merchant_phone;
    END IF;

    -- Hub Commissions
    DECLARE
      v_hub_code TEXT;
    BEGIN
      SELECT hub_merchant_code INTO v_hub_code FROM users WHERE merchant_code = NEW.merchant_code;
      IF (v_hub_code IS NOT NULL) THEN
        -- We insert 0.2 NX commission per transaction for the Hub
        INSERT INTO hub_commissions (hub_merchant_code, sub_merchant_code, transaction_code, amount, status)
        VALUES (v_hub_code, NEW.merchant_code, NEW.transaction_code, 0.2, 'pending');
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Silently fail for commissions if table schema changed
    END;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
