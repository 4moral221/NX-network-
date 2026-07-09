-- Final fix for restock_batches: column names and RLS
DO $$
BEGIN
    -- 1. Rename total_quantity to total_qty if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_quantity') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_qty') THEN
        ALTER TABLE restock_batches RENAME COLUMN total_quantity TO total_qty;
    END IF;

    -- 2. Add total_qty if neither exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_qty') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'total_quantity') THEN
        ALTER TABLE restock_batches ADD COLUMN total_qty integer DEFAULT 0;
    END IF;

    -- 3. Ensure other columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_end') THEN
        ALTER TABLE restock_batches ADD COLUMN window_end timestamptz DEFAULT (now() + interval '48 hours');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'sku_name') THEN
        ALTER TABLE restock_batches ADD COLUMN sku_name text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'normal_price') THEN
        ALTER TABLE restock_batches ADD COLUMN normal_price numeric(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'offered_price') THEN
        ALTER TABLE restock_batches ADD COLUMN offered_price numeric(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restock_batches' AND column_name = 'window_start') THEN
        ALTER TABLE restock_batches ADD COLUMN window_start timestamptz DEFAULT now();
    END IF;
END $$;

-- Ensure nx_products has price and active columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nx_products' AND column_name = 'price') THEN
        ALTER TABLE nx_products ADD COLUMN price numeric(12,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'nx_products' AND column_name = 'active') THEN
        ALTER TABLE nx_products ADD COLUMN active boolean DEFAULT true;
    END IF;
END $$;

-- Update open_or_get_batch to use correct columns
CREATE OR REPLACE FUNCTION open_or_get_batch(
  p_sku_code text,
  p_variant_code text,
  p_qty int
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id bigint;
  v_sku_name text;
  v_normal_price numeric(12,2);
BEGIN
  -- Fetch SKU details from nx_products if possible
  SELECT name, price INTO v_sku_name, v_normal_price 
  FROM nx_products 
  WHERE sku = p_sku_code 
  LIMIT 1;

  -- Look for an open batch for this SKU/Variant within the last 48 hours
  SELECT id INTO v_batch_id
  FROM restock_batches
  WHERE sku_code = p_sku_code
    AND (variant_code = p_variant_code OR (variant_code IS NULL AND p_variant_code IS NULL))
    AND status = 'open'
    AND created_at > (now() - interval '48 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    INSERT INTO restock_batches (
      sku_code, sku_name, variant_code, total_qty, 
      merchant_count, status, created_at, window_start, window_end, 
      normal_price
    )
    VALUES (
      p_sku_code, v_sku_name, p_variant_code, p_qty, 
      1, 'open', now(), now(), now() + interval '48 hours',
      COALESCE(v_normal_price, 0)
    )
    RETURNING id INTO v_batch_id;
  ELSE
    UPDATE restock_batches
    SET total_qty = total_qty + p_qty,
        merchant_count = merchant_count + 1,
        sku_name = COALESCE(sku_name, v_sku_name),
        normal_price = COALESCE(normal_price, v_normal_price),
        updated_at = now()
    WHERE id = v_batch_id;
  END IF;

  RETURN v_batch_id;
END;
$$;

-- Enable RLS (already enabled but just in case)
ALTER TABLE restock_batches ENABLE ROW LEVEL SECURITY;

-- 4. Set hardened RLS policies for batches
DROP POLICY IF EXISTS "Allow public batch lookup" ON restock_batches;
DROP POLICY IF EXISTS "Public read batches" ON restock_batches;

CREATE POLICY "Allow anon batch lookup" ON restock_batches 
FOR SELECT TO anon USING (true);

CREATE POLICY "Allow auth batch lookup" ON restock_batches 
FOR SELECT TO authenticated USING (true);

-- 5. Ensure FMCG partners can see their own offers' batches
CREATE POLICY "FMCG can see all batches" ON restock_batches
FOR SELECT TO authenticated USING (true);
