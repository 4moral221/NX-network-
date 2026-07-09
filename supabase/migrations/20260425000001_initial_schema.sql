-- Enable vector extension for HNSW/pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for trigram similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    national_id TEXT,
    recovery_pin TEXT, -- hashed
    dashboard_password TEXT, -- for admin access
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'merchant', 'admin')),
    tier TEXT DEFAULT 'BASIC', -- Legacy field
    franchise_tier TEXT DEFAULT 'BASIC',
    franchise_fee_until TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
    merchant_code TEXT UNIQUE,
    hub_merchant_code TEXT, -- reference to another merchant
    language TEXT DEFAULT 'en',
    is_first_purchase_used BOOLEAN DEFAULT false,
    cancellation_count INTEGER DEFAULT 0,
    recovered_to TEXT,
    is_admin BOOLEAN DEFAULT false,
    location TEXT,
    acceptance_percent NUMERIC(5,4) DEFAULT 0.2,
    admin_role TEXT DEFAULT 'super_admin',
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    nx_balance NUMERIC(12,2) DEFAULT 0,
    applied_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Products table for hybrid matching
CREATE TABLE IF NOT EXISTS nx_products (
    id SERIAL PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    embedding VECTOR(512), -- Jina v3 default mapped to 512 dimensions
    category TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_code TEXT UNIQUE NOT NULL,
    customer_phone TEXT NOT NULL,
    merchant_code TEXT NOT NULL,
    merchant_phone TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    cash_paid NUMERIC DEFAULT 0,
    nx_redeemed NUMERIC DEFAULT 0,
    nx_earned NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending_customer', 'awaiting_merchant', 'confirmed', 'completed', 'rejected_by_merchant', 'expired', 'cancelled', 'failed')),
    fraud_score INTEGER DEFAULT 0,
    fraud_status TEXT DEFAULT 'safe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ledger for NX balance
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_phone TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit')),
    amount NUMERIC NOT NULL,
    reference TEXT, -- e.g. transaction_id
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Merchant Applications
CREATE TABLE IF NOT EXISTS merchant_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    business_name TEXT NOT NULL,
    location TEXT NOT NULL,
    national_id TEXT NOT NULL,
    recovery_pin TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Merchant Margins & Payouts
CREATE TABLE IF NOT EXISTS merchant_margins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code TEXT UNIQUE NOT NULL,
    gross_margin NUMERIC DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Merchant Inventory
CREATE TABLE IF NOT EXISTS merchant_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code TEXT NOT NULL,
    sku_code TEXT NOT NULL,
    variant_code TEXT,
    quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merchant_code, sku_code, variant_code)
);

-- Restock Requests
CREATE TABLE IF NOT EXISTS restock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code TEXT NOT NULL,
    merchant_phone TEXT NOT NULL,
    sku_code TEXT,
    sku_name TEXT,
    quantity INTEGER,
    variant_code TEXT,
    raw_input TEXT,
    fuzzy_resolved BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    batch_id TEXT
);

-- Restock Invoices
CREATE TABLE IF NOT EXISTS restock_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_code TEXT NOT NULL,
    invoice_amount NUMERIC NOT NULL,
    nx_paid NUMERIC DEFAULT 0,
    cash_due NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- White-label/Whitelisted merchants
CREATE TABLE IF NOT EXISTS merchant_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    hub_merchant_code TEXT,
    added_by TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hub Commissions
CREATE TABLE IF NOT EXISTS hub_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_merchant_code TEXT NOT NULL,
    sub_merchant_code TEXT NOT NULL,
    transaction_code TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    paid_out BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fraud Detection Logs
CREATE TABLE IF NOT EXISTS fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    transaction_id TEXT,
    risk_score INTEGER DEFAULT 0,
    reason TEXT,
    status TEXT DEFAULT 'flagged',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System Logs
CREATE TABLE IF NOT EXISTS nx_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT,
    session_id TEXT,
    error TEXT,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FMCG Partners
CREATE TABLE IF NOT EXISTS fmcg_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact TEXT,
    api_key TEXT UNIQUE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FMCG Margin Contributions
CREATE TABLE IF NOT EXISTS fmcg_margin_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fmcg_partner_id UUID REFERENCES fmcg_partners(id),
    sku_code TEXT NOT NULL,
    contribution_amount NUMERIC NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP WITH TIME ZONE
);

-- Restock Batches
CREATE TABLE IF NOT EXISTS restock_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku_code TEXT NOT NULL,
    variant_code TEXT,
    total_qty INTEGER DEFAULT 0,
    merchant_count INTEGER DEFAULT 0,
    window_end TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'deal_received', 'fulfilled')),
    fmcg_partner_id UUID REFERENCES fmcg_partners(id),
    offered_price NUMERIC,
    normal_price NUMERIC,
    deal_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Restock Batch Offers
CREATE TABLE IF NOT EXISTS restock_batch_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES restock_batches(id),
    fmcg_partner_id UUID REFERENCES fmcg_partners(id),
    offered_price NUMERIC NOT NULL,
    delivery_days INTEGER DEFAULT 3,
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rate Limits
CREATE TABLE IF NOT EXISTS nx_rate_limits (
    phone TEXT PRIMARY KEY,
    hit_count INTEGER DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigram index for fast string similarity search
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON nx_products USING gin (normalized_name gin_trgm_ops);

-- HNSW index for high-performance vector search (Cosine distance)
CREATE INDEX IF NOT EXISTS idx_products_embedding_hnsw ON nx_products USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_nx_products_updated_at BEFORE UPDATE ON nx_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchant_margins_updated_at BEFORE UPDATE ON merchant_margins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_merchant_inventory_updated_at BEFORE UPDATE ON merchant_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restock_invoices_updated_at BEFORE UPDATE ON restock_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_restock_batches_updated_at BEFORE UPDATE ON restock_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Hybrid match function for SKU resolution
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

-- Open or get a batch for restock aggregation
CREATE OR REPLACE FUNCTION open_or_get_batch(
  p_sku_code text,
  p_variant_code text,
  p_qty int
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_batch_id uuid;
BEGIN
  -- Look for an open batch for this SKU/Variant within the last 24 hours
  SELECT id INTO v_batch_id
  FROM restock_batches
  WHERE sku_code = p_sku_code
    AND (variant_code = p_variant_code OR (variant_code IS NULL AND p_variant_code IS NULL))
    AND status = 'open'
    AND created_at > (now() - interval '24 hours')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    INSERT INTO restock_batches (sku_code, variant_code, total_qty, merchant_count, window_end, status, normal_price)
    VALUES (p_sku_code, p_variant_code, p_qty, 1, now() + interval '4 hours', 'open', 100)
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

-- Detect transaction fraud
CREATE OR REPLACE FUNCTION detect_transaction_fraud()
RETURNS TRIGGER AS $$
DECLARE
    score INT := 0;
    reasons TEXT[] := ARRAY[]::TEXT[];
    recent_count INT;
    user_created_at TIMESTAMPTZ;
    identical_count INT;
BEGIN
    -- Rule 1: High amount
    IF NEW.amount > 50000 THEN
        score := score + 40;
        reasons := array_append(reasons, 'High amount (>50k)');
    END IF;

    -- Rule 2: Velocity
    SELECT count(*) INTO recent_count FROM transactions
    WHERE customer_phone = NEW.customer_phone AND created_at > (now() - interval '1 minute');
    IF recent_count > 5 THEN
        score := score + 30;
        reasons := array_append(reasons, 'Velocity alert (>5 txns/min)');
    END IF;

    -- Rule 3: New user
    SELECT created_at INTO user_created_at FROM users WHERE phone = NEW.customer_phone;
    IF user_created_at > (now() - interval '24 hours') THEN
        score := score + 20;
        reasons := array_append(reasons, 'New user (<24h)');
    END IF;

    NEW.fraud_score := score;
    IF score >= 50 THEN
        NEW.fraud_status := 'suspicious';
        INSERT INTO fraud_logs (transaction_id, phone, risk_score, reason, status)
        VALUES (NEW.transaction_code, NEW.customer_phone, score, array_to_string(reasons, ', '), 'flagged');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_detect_fraud ON transactions;
CREATE TRIGGER tr_detect_fraud BEFORE INSERT ON transactions FOR EACH ROW EXECUTE FUNCTION detect_transaction_fraud();
