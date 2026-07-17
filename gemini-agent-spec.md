# NX Network Gemini Agent Spec

## Overview
Gemini agent handles **backend workflows, async jobs, and data processing**. Claude handles **Supabase schema, migrations, edge function logic**. Frontend dev is separate (React/HTML teams).

---

## Agent Responsibilities

### ✅ Gemini Handles

**Data Processing & Sync**
- Batch reconciliation: Match restock requests → invoices → deliveries
- Daily settlement batches: Aggregate merchant transactions, calculate pool earnings
- Ledger entry reconciliation: Flag orphaned entries, mismatched debits/credits
- SKU price sync: Pull from FMCG partners, update `sku_prices` table
- Merchant margin updates: Ingest FMCG contribution data, upsert `fmcg_margin_contributions`

**Scheduled Jobs (Cloud Scheduler → Pub/Sub → Agent)**
- End-of-day: Summarize merchant daily stats, insert into `v_merchant_stats_daily`
- Weekly: Generate merchant earning reports, send SMS to top performers
- Monthly: Process franchise fees, invoice merchants for tier cost
- Franchise renewal: Check `franchise_fee_until`, auto-suspend if unpaid

**Data Quality & Fraud**
- Anomaly detection: Flag >5 txns from same customer to same merchant within 1 hour
- Duplicate transaction check: Find transactions with same phone + merchant + amount within 5 min
- Ledger audit: Verify all debits have matching credits (or flag as orphaned)
- Stale restock tracking: Restock requests pending >7 days → auto-close + refund NX

**Reporting & Analytics**
- Daily KPI export: Volume (KES), transaction count, unique merchants/customers
- FMCG demand report: Aggregate restock requests by SKU, send to FMCG partners
- Hub performance: Commission accrual, sub-merchant count, pool utilization per hub
- Merchant cohort analysis: Retention, restock frequency, tier upgrade likelihood

**Partner Integration**
- Wholesaler batch fulfilment status: Poll delivery jobs, update invoice `logistics_status`
- FMCG API sync: POST merchant demand to partner APIs (if they have webhooks)
- Logistics partner bid scoring: Track delivery partner SLA, prefer faster movers next time

---

### ❌ Gemini Does NOT Handle

- USSD menu logic (edge functions only)
- Real-time customer payments (edge functions)
- Frontend UI/UX (React + HTML dashboards)
- Supabase schema design (Claude)
- Migration creation & deployment (Claude)
- RLS policy setup (Claude)
- API key rotation (manual ops)
- Admin portal authentication (manual setup)

---

## Supabase Access

**Gemini gets:**
- Supabase **Service Role Key** (read/write all tables)
- Connection pooling: 15 PgBouncer connections reserved for agent
- Rate limiting: Batch queries in transactions to avoid connection thrashing

**Supabase stays with Claude for:**
- Schema changes (migrations via `apply_migration`)
- RLS policy updates
- View creation/modification
- Extension enablement
- Database security audit

**Daily sync pattern:**
```
Gemini queries → Updates ledger_entries, merchant_margins, restock_invoices
Claude reviews migration requests from Gemini tickets → applies via MCP
```

---

## Data Flow

### Real-Time (Edge Function)
```
Customer dials *384#
→ nx-ussd function (edge, <200ms)
→ Queries users, transactions, ledger
→ Returns menu text
```

### Async (Gemini)
```
Scheduler trigger (00:05 UTC daily)
→ Gemini agent invoked
→ Queries v_merchant_stats_daily
→ Inserts daily summary
→ Sends SMS to merchants
→ Logs to ops_audit_logs
```

---

## Sample Tasks (Priority Order)

### P0: Daily Settlement (Daily, 00:05 UTC)
**Task:** Close merchant daily cycle, calculate commissions

```sql
-- Pseudo-logic Gemini executes
SELECT merchant_code, COUNT(*) as txn_count, SUM(amount) as daily_volume
FROM transactions
WHERE status IN ('confirmed', 'completed')
AND created_at >= CURRENT_DATE
AND created_at < CURRENT_DATE + INTERVAL '1 day'
GROUP BY merchant_code;

-- For each merchant:
INSERT INTO v_merchant_stats_daily (merchant_code, txn_count, daily_volume, ...)
INSERT INTO hub_commissions (hub_merchant_code, amount, ...) if hub merchant
```

### P0: Restock Invoice Aging (Daily, 02:00 UTC)
**Task:** Auto-close invoices unpaid >14 days

```sql
SELECT id FROM restock_invoices
WHERE status = 'pending'
AND created_at < NOW() - INTERVAL '14 days'
-- Update to 'expired', refund NX to merchant pool
```

### P1: Ledger Orphan Audit (Weekly, Sunday 00:00 UTC)
**Task:** Find debit entries without matching credit

```sql
SELECT account_phone, SUM(amount) as imbalance
FROM ledger_entries
GROUP BY account_phone
HAVING SUM(amount) < 0
-- Flag high-value imbalances, log to fraud_logs
```

### P1: FMCG Demand Report (Weekly, Monday 06:00 UTC)
**Task:** Aggregate restock demand by SKU, POST to FMCG partner APIs

```sql
SELECT sku_code, SUM(quantity) as total_demand, COUNT(DISTINCT merchant_code) as merchants
FROM restock_requests
WHERE created_at >= NOW() - INTERVAL '7 days'
AND status IN ('pending', 'dispatched')
GROUP BY sku_code
-- POST to fmcg_partners with api_key_hash auth
```

### P2: Merchant Franchise Renewal (Monthly, 1st of month 08:00 UTC)
**Task:** Invoice CERTIFIED/HUB merchants for franchise fees

```sql
SELECT merchant_code, franchise_tier, franchise_fee_until
FROM users
WHERE franchise_tier IN ('CERTIFIED', 'HUB')
AND franchise_fee_until <= CURRENT_DATE
-- Insert into franchise_fee_payments (status='pending')
-- Send SMS to merchant: "Your franchise fee is due"
```

### P2: Hub Performance Report (Monthly, 15th 10:00 UTC)
**Task:** Summarize hub earnings, sub-merchant health

```sql
SELECT hub_merchant_code, COUNT(DISTINCT sub_merchant_code) as sub_count,
       SUM(amount) as commissions_accrued
FROM hub_commissions
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY hub_merchant_code
-- Send detailed report to hub merchants
```

---

## Agent Environment

### Inputs (Pub/Sub or CLI)
```json
{
  "task": "daily_settlement",
  "date": "2026-07-17",
  "supabase_url": "https://balrpczytusvzzquzqob.supabase.co",
  "service_role_key": "sbp_...",
  "dry_run": false
}
```

### Outputs
- Rows affected (updated ledger, inserted summaries, etc.)
- Errors logged to `ops_audit_logs`
- SMS notifications sent via Africa's Talking
- Report files (optional: CSV to Cloud Storage)

### Execution Environment
- Google Cloud Run (or Compute Engine)
- Node.js + Supabase client
- Environment variables: SUPABASE_URL, SERVICE_ROLE_KEY, AT_API_KEY, AT_USERNAME
- Timezone: EAT (UTC+3)

---

## What Claude Does (Supabase Ops)

- Review daily agent logs in `ops_audit_logs` table
- If agent posts new schema requests (e.g., "need new `merchant_kpi_daily` table"):
  - Claude writes migration
  - Claude deploys via `apply_migration`
  - Claude notifies agent the new table is ready
- Monthly review: RLS policies, query performance, connection pool scaling
- Incident response: If agent errors spike, Claude checks edge function logs, DB indexes

---

## Testing & Rollout

### Dev Environment
- Gemini agent runs on test Supabase branch (`develop`)
- Dry-run mode: Logs changes, doesn't commit
- Agent queries test data only

### Prod Rollout
- Week 1: Daily settlement only (P0)
- Week 2: Add restock aging, ledger audit (P0, P1)
- Week 3: Add FMCG demand, franchise renewal (P1, P2)
- Week 4: Add hub performance (P2)

Each task gets a feature flag: `ENABLE_DAILY_SETTLEMENT`, etc.

---

## Success Metrics

- **Latency:** Agent tasks complete within SLA (daily settlement <5 min)
- **Accuracy:** Ledger reconciliation diff <0.1% of daily volume
- **Availability:** 99.5% task success rate (retries built in)
- **Merchant experience:** Invoice delivery <6 hours after txns close

---

## Handoff Criteria

Agent is ready for production when:
- ✅ All P0 tasks pass dry-run for 7 consecutive days
- ✅ Ledger audit finds zero orphaned entries
- ✅ FMCG demand report validates against manual counts
- ✅ Franchise fee invoices match expected amounts
- ✅ Error logging to `ops_audit_logs` is clean

Claude reviews logs daily first month, then weekly.
