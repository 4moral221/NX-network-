-- ==========================================
-- NX Network: Production Data Purge
-- ==========================================
-- This migration cleans up all operational data while
-- preserving Admin Credentials, Product Catalogs, 
-- and Fuzzy Matching artifacts.

-- 1. Remove all non-admin users
-- Keeps anyone marked as is_admin = true
DELETE FROM users 
WHERE is_admin = false;

-- 2. Purge all operational and transactional history
-- CASCADE handles dependent records automatically
TRUNCATE TABLE 
  transactions,
  ledger_entries,
  merchant_margins,
  merchant_inventory,
  restock_batches,
  batch_nx_credits,
  restock_requests,
  restock_invoices,
  fmcg_margin_contributions,
  merchant_whitelist,
  merchant_applications,
  hub_commissions,
  nx_rate_limits,
  nx_logs,
  restock_batch_offers,
  franchise_fee_payments,
  ops_audit_logs,
  merchant_notifications,
  fraud_logs
CASCADE;

-- 3. Restore special virtual accounts
-- NX_SYSTEM is required for fee tracking logic
INSERT INTO ledger_entries (account_phone, entry_type, amount, reference, expires_at)
VALUES ('NX_SYSTEM', 'credit', 0, 'SYSTEM_RESET', '2099-12-31T00:00:00Z')
ON CONFLICT DO NOTHING;

-- 4. Re-sync cached balances for remaining admins
UPDATE users SET nx_balance = 0;

-- 5. Note on Product Catalogs & Fuzzy Matching
-- The following tables are EXPLICITLY PRESERVED:
-- - 'nx_products': Brand names and normalized synonyms
-- - 'sku_catalog': Base SKU codes and Jina embeddings
-- - 'fmcg_partners': Core partner profiles
-- These are foundational for system operation and fuzzy search.
