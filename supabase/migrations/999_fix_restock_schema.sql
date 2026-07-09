-- Fix for Restocking Logic and Schema Mismatches

-- 1. Ensure nx_products table exists with 512-dim embedding
CREATE TABLE IF NOT EXISTS nx_products (
    id SERIAL PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    embedding VECTOR(512),
    category TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure trigram and vector extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 3. Trigram index
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON nx_products USING gin (normalized_name gin_trgm_ops);

-- 4. Hybrid Match Function (Must match skuMatcher.ts expectations)
CREATE OR REPLACE FUNCTION match_sku_hybrid(
  query_embedding vector(512),
  query_text text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  sku text,
  name text,
  score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.sku,
    p.name,
    (
      (0.7 * (1 - (p.embedding <=> query_embedding))) +
      (0.3 * similarity(p.normalized_name, query_text))
    )::float AS score
  FROM nx_products p
  WHERE (
    (0.7 * (1 - (p.embedding <=> query_embedding))) +
    (0.3 * similarity(p.normalized_name, query_text))
  ) > match_threshold
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- 5. Open or Get Batch Function
CREATE OR REPLACE FUNCTION open_or_get_batch(
  p_sku_code text,
  p_variant_code text default null,
  p_qty int default 0
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id bigint;
BEGIN
  -- Try to find an existing open batch
  SELECT id INTO v_batch_id
  FROM restock_batches
  WHERE sku_code = p_sku_code
    AND (variant_code = p_variant_code OR (variant_code IS NULL AND p_variant_code IS NULL))
    AND status = 'open'
    AND (window_end IS NULL OR window_end > now())
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    INSERT INTO restock_batches (sku_code, variant_code, total_qty, merchant_count, status, created_at, window_end)
    VALUES (p_sku_code, p_variant_code, p_qty, 1, 'open', now(), now() + interval '48 hours')
    RETURNING id INTO v_batch_id;
  ELSE
    UPDATE restock_batches
    SET total_qty = total_qty + p_qty,
        merchant_count = merchant_count + 1,
        updated_at = now()
    WHERE id = v_batch_id;
  END IF;

  RETURN v_batch_id;
END;
$$;

-- 5.1 Helper: refresh_batch_totals (bigint version)
CREATE OR REPLACE FUNCTION refresh_batch_totals(p_batch_id bigint)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE restock_batches
  SET
    total_qty      = (SELECT coalesce(sum(quantity), 0) FROM restock_requests WHERE batch_id = p_batch_id AND status != 'cancelled'),
    merchant_count = (SELECT count(distinct merchant_code) FROM restock_requests WHERE batch_id = p_batch_id AND status != 'cancelled'),
    updated_at     = now()
  WHERE id = p_batch_id;
END;
$$;

-- 6. Ensure restock_requests has correct columns
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS raw_input TEXT;
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS fuzzy_resolved BOOLEAN DEFAULT false;
ALTER TABLE restock_requests ADD COLUMN IF NOT EXISTS variant_code TEXT;

-- 7. Ensure inventory has correct unique constraint
-- (Assuming we want to avoid duplicates on merchant_code + sku_code + variant_code)
-- First check if the constraint exists, if not add it.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'idx_inventory_unique') THEN
        ALTER TABLE merchant_inventory ADD CONSTRAINT idx_inventory_unique UNIQUE (merchant_code, sku_code, variant_code);
    END IF;
END $$;
