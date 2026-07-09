-- Harmonize restock_batches table to match application expectations
DO $$
BEGIN
    -- 1. Rename total_quantity to total_qty if total_qty doesn't exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_qty') THEN
        ALTER TABLE restock_batches RENAME COLUMN total_quantity TO total_qty;
    END IF;

    -- 2. Add total_qty if neither exists (fallback)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_qty') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_quantity') THEN
        ALTER TABLE restock_batches ADD COLUMN total_qty integer DEFAULT 0;
    END IF;

    -- 3. Add missing columns expected by PartnersPortal and batchHelper
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_end') THEN
        ALTER TABLE restock_batches ADD COLUMN window_end timestamptz DEFAULT (now() + interval '48 hours');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_start') THEN
        ALTER TABLE restock_batches ADD COLUMN window_start timestamptz DEFAULT now();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'sku_name') THEN
        ALTER TABLE restock_batches ADD COLUMN sku_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'saving_pct') THEN
        -- Add as a numeric column first, we can make it generated if needed but a plain column is safer for migrations
        ALTER TABLE restock_batches ADD COLUMN saving_pct numeric(5,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'deal_note') THEN
        ALTER TABLE restock_batches ADD COLUMN deal_note text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'fmcg_partner_id') THEN
        ALTER TABLE restock_batches ADD COLUMN fmcg_partner_id integer;
    END IF;
END $$;
