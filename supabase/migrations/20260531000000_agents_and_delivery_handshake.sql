-- Agents Table
CREATE TABLE IF NOT EXISTS delivery_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  agent_code TEXT UNIQUE NOT NULL, -- e.g. AJ007
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Handshakes
CREATE TABLE IF NOT EXISTS delivery_handshakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES restock_invoices(id),
  merchant_code TEXT NOT NULL,
  agent_code TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'success'
);

-- Logs Table (Centralized Project Logs)
CREATE TABLE IF NOT EXISTS project_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT DEFAULT 'info', -- info, warn, error
  module TEXT NOT NULL, -- e.g. 'USSD', 'PORTAL', 'API'
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Service role will bypass)
ALTER TABLE delivery_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_handshakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_logs ENABLE ROW LEVEL SECURITY;

-- Simple Policies
CREATE POLICY "Public read agents" ON delivery_agents FOR SELECT USING (true);
CREATE POLICY "Public read handshakes" ON delivery_handshakes FOR SELECT USING (true);
CREATE POLICY "Public read logs" ON project_logs FOR SELECT USING (true);
