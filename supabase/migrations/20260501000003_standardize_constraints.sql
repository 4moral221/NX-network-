-- Standardizing constraints across the database to avoid name collisions and logic errors

DO $$
BEGIN
    -- 1. Standardize Merchant Inventory Unique Constraint
    -- Drop old names if they exist
    ALTER TABLE merchant_inventory DROP CONSTRAINT IF EXISTS merchant_inventory_merchant_code_sku_code_variant_key;
    ALTER TABLE merchant_inventory DROP CONSTRAINT IF EXISTS idx_inventory_unique;
    
    -- Add the standard one
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_inventory_unique_record') THEN
        ALTER TABLE merchant_inventory ADD CONSTRAINT merchant_inventory_unique_record UNIQUE (merchant_code, sku_code, variant_code);
    END IF;

    -- 2. Standardize restock_batches constraints
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restock_batches_status_check') THEN
        ALTER TABLE restock_batches ADD CONSTRAINT restock_batches_status_check CHECK (status IN ('open', 'negotiating', 'fulfilled', 'cancelled', 'sent_to_fmcg', 'deal_received', 'deal_accepted'));
    END IF;
END $$;
