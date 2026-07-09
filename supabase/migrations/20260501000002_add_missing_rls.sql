-- Additional RLS policies for restocking and merchant management
-- Enabling public/auth access to non-sensitive data required for app operation

-- 1. Merchant Margins: Allow select to see pool health
DROP POLICY IF EXISTS "Allow public margins lookup" ON merchant_margins;
CREATE POLICY "Allow public margins lookup" ON merchant_margins FOR SELECT TO anon USING (true);

-- 2. FMCG Contribs: Allow select to see boosts
DROP POLICY IF EXISTS "Allow public contributions lookup" ON fmcg_margin_contributions;
CREATE POLICY "Allow public contributions lookup" ON fmcg_margin_contributions FOR SELECT TO anon USING (true);

-- 3. Restock Batches: Allow select for visibility
DROP POLICY IF EXISTS "Allow public batch lookup" ON restock_batches;
CREATE POLICY "Allow public batch lookup" ON restock_batches FOR SELECT TO anon USING (true);

-- 4. Restock Invoices: Allow public select for settlement
DROP POLICY IF EXISTS "Allow public invoice lookup" ON restock_invoices;
CREATE POLICY "Allow public invoice lookup" ON restock_invoices FOR SELECT TO anon USING (true);

-- 5. Restock Batch Offers: Allow select for visibility of bids
DROP POLICY IF EXISTS "Allow public batch offer lookup" ON restock_batch_offers;
CREATE POLICY "Allow public batch offer lookup" ON restock_batch_offers FOR SELECT TO anon USING (true);

-- 6. Hub Commissions: Allow select
DROP POLICY IF EXISTS "Allow public commission lookup" ON hub_commissions;
CREATE POLICY "Allow public commission lookup" ON hub_commissions FOR SELECT TO anon USING (true);
