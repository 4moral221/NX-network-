-- Ensure restock_batches has the correct columns
DO $$
BEGIN
    -- Ensure window_end exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_end') THEN
        ALTER TABLE restock_batches ADD COLUMN window_end timestamptz;
        -- Set a default window for existing batches
        UPDATE restock_batches SET window_end = created_at + interval '48 hours' WHERE window_end IS NULL;
    END IF;

    -- Ensure window_start exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_start') THEN
        ALTER TABLE restock_batches ADD COLUMN window_start timestamptz DEFAULT now();
    END IF;

    -- Ensure sku_name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'sku_name') THEN
        ALTER TABLE restock_batches ADD COLUMN sku_name text;
    END IF;

    -- Ensure total_qty exists (some parts of the code use total_qty, some might use total_quantity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_qty') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_quantity') THEN
             ALTER TABLE restock_batches RENAME COLUMN total_quantity TO total_qty;
        ELSE
             ALTER TABLE restock_batches ADD COLUMN total_qty integer DEFAULT 0;
        END IF;
    END IF;
END $$;
