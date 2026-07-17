# NX Network — Project Documentation

Last verified against live Supabase state: **2026-07-15**
Project: `balrpczytusvzzquzqob`

---

## 1. What This Is

NX Network is a USSD-first loyalty and micro-distribution platform for Kenya's
informal retail sector (dukas, kiosks, Mama Mboga). Customers earn NX loyalty
tokens on purchases and redeem them at enrolled merchants. Merchants use
accumulated NX to offset restock invoices. FMCG brands, wholesalers, and
logistics partners plug into the network via a scoped REST API.

**No smartphone required.** Every consumer and merchant flow runs on
`*384*6180#` (USSD) or SMS to `6180`. A React admin dashboard and a
partner-facing portal exist for the business side.

---

## 2. Business Model

| Revenue stream | Mechanism |
|---|---|
| Trading margin | NX Network buys stock at trade price, sells to merchants at markup (60–70% of markup funds merchant pool by tier) |
| FMCG data/brand fees | Brands pay for sell-through data + pool injection for shelf presence |
| Transaction fees | 2 NX flat fee per confirmed customer transaction |
| Franchise fees | CERTIFIED (KES 500/mo), HUB (KES 1,000/mo) |

**Merchant tiers:** BASIC → CERTIFIED → HUB. Higher tiers get better pool
rates, higher NX acceptance ceilings, and (HUB only) sub-merchant recruitment
with 0.2 NX commission per sub-merchant transaction.

---

## 3. Architecture

```
USSD (*384*6180#) ─┐
SMS (6180)         ─┼──► Supabase Edge Functions (Deno) ──► Postgres (RLS)
Admin Dashboard    ─┘         │
Partner API (FMCG/            │
 Wholesaler/Logistics) ───────┘
```

- **Backend:** Supabase — Postgres + PostgREST + RLS + Deno Edge Functions
- **USSD/SMS gateway:** Africa's Talking, shortcode `6180` (both channels)
- **Frontend:** Vite + React 19, deployed on Vercel (admin, merchant, FMCG,
  logistics portals — hostname-routed from one codebase)
- **Auth:** Two separate systems by design —
  - Admins: Supabase Auth (email/password) → RLS via `users.is_admin`
  - Merchants/customers: USSD-native, PIN hashed via `pgcrypto`/`bcrypt`,
    no Supabase Auth identity at all
  - Partners (FMCG/wholesaler/logistics): SHA-256 hashed API keys, scoped

### Edge functions (live, all ACTIVE)

| Function | Purpose |
|---|---|
| `nx-ussd` | Core USSD handler — registration, PIN login, payments, restock, family accounts, basket logging |
| `sms-restock` | Inbound SMS restock parser (`BR*10`, `pembe 2kg@120*10`) |
| `fmcg-api` | Single scoped endpoint serving FMCG, wholesaler, and logistics partners |
| `api-auth` | Generic API key validation (scope-checked) |
| `approve-merchant-en` | Trigger-fired on merchant application approval → SMS + user provisioning |
| `send-partner-api-key` | Delivers generated partner keys |

`nx-ussd` is ~96KB and consistently exceeds MCP tool size limits — deploy via
Supabase CLI (`supabase functions deploy nx-ussd`) when working outside an
agent session with direct MCP access.

---

## 4. Data Model — Core Tables

**Identity & auth**
- `users` — dual-purpose: USSD-registered merchants/customers (keyed by
  `phone`) AND email-authenticated admins (keyed by `id` = Supabase Auth
  UID). `is_admin` boolean is the actual authorization gate everywhere.
- `admin_users` — companion roster table, NOT the authorization mechanism
  (RLS checks `users.is_admin`, not this table's existence)
- `merchant_applications`, `merchant_whitelist` — onboarding pipeline

**Money movement**
- `transactions` — atomic unit of every payment (customer, merchant,
  family-code). `transaction_code` is the join key everywhere.
- `ledger_entries` — append-only NX credit/debit log, `expires_at` drives
  the 2-month customer NX expiry
- `merchant_margins` — per-merchant pool basis (gross_margin × tier pool rate)

**Family accounts** (parent controls a shared NX spending code)
- `family_accounts` — parent-owned code, `allow_spending`/`allow_earning`
  toggles, optional per-txn/daily spend limits, optional merchant pinning
- `family_daily_spend` — rolling daily total per code, enforces daily limit
- `family_spend_log` — **exists, unused**. Legacy per-transaction audit
  table from an earlier build. Not written to by current `nx-ussd` logic.
  See §6 (Known Gaps).

**Basket / sell-through intelligence**
- `transaction_items` — optional SKU-level log of what was actually bought,
  linked to `transaction_code`. Skippable on both merchant and customer side.
- `merchant_prices` — rolling price index (last/avg/min/max) per merchant
  per SKU per variant, auto-updated via trigger on `transaction_items` insert

**Restock & supply chain**
- `restock_requests` — merchant orders (USSD or SMS), fuzzy-matched via
  `match_sku_trgm` (pg_trgm `word_similarity`, NOT embeddings — see §6)
- `restock_batches` — aggregated demand, assignable to a `wholesaler_id`
  (→ `fmcg_partners.id`)
- `restock_invoices` — one per merchant per fulfilled batch, billed by
  **that merchant's actual quantity**, not a batch average
- `delivery_jobs` / `delivery_job_bids` — sealed-bid marketplace for
  logistics partners (see §5)

**Partner API**
- `fmcg_partners` — all partner types live here (`partner_type`: fmcg,
  wholesaler, logistics). The old separate `partners` table was dropped.
- `api_keys` — SHA-256 hashed, `scope` (jsonb array), `partner_type`,
  optional `expires_at`

---

## 5. The nx_logistics Bidding Marketplace

When a wholesaler fulfils a batch, one `delivery_jobs` row opens per
invoice. Logistics partners:

1. `GET /jobs` — see open jobs (merchant, area, invoice value as context).
   **Sealed bidding** — never see competing bid amounts.
2. `POST /bid` — submit price + ETA. Upsertable (re-bid to change terms).
3. Admin calls `POST /accept-bid` (via `X-Admin-Secret`) — assigns the job,
   rejects competing bids, flips the invoice into the pickup pipeline.
4. `PATCH /delivery` — **ownership-checked**: only the assigned partner's
   key can update status. This closed a real gap where any logistics key
   could previously mark any invoice as delivered.

No auto-accept-lowest-bid yet (no cron infrastructure exists). No
route-bundling (1 invoice = 1 job). No geocoding — `pickup_location` is
free text. See §6.

---

## 6. Known Gaps / Roadmap

| Gap | Impact | Notes |
|---|---|---|
| No geocoding on merchant/pickup locations | Logistics partners can't route-optimize | Biggest real blocker to external logistics partner onboarding |
| `family_spend_log` unused | Parents can't see itemized family transaction history, only daily totals | Table exists, schema is fine, just needs wiring into `nx-ussd` |
| No API docs / sandbox for partners | Can't onboard external FMCG/wholesaler/logistics partners smoothly | Flagged in production readiness report |
| USSD session state from `text` param only | Long sessions near AT's ~182-char truncation limit could silently break | No server-side session table yet |
| No rate limiting on `nx-ussd`/`sms-restock` at edge | `nx_rate_limits` table exists, unused | |
| No webhooks for partners | Partners must poll `/jobs/mine`, `/dispatch` | |
| Daily-spend accept-bid has no expiry window | A job stays open indefinitely until manually accepted | |
| **`BASIC` tier `acceptCeiling` — 0.20 vs 0.30 conflict** | Unresolved | Prior session notes state 0.20 is "confirmed ground truth," but every live deploy this session and the original dashboard/landing code consistently use 0.30, without correction. **Needs explicit resolution with Alex before either is treated as authoritative.** |

---

## 7. Security Posture (as of last audit)

- All tables have RLS enabled (verified, zero exceptions)
- Sensitive functions (`hash_password`, `verify_password`, `match_sku_trgm`,
  `ops_adjust_nx`, trigger functions) are `service_role`-only — **but see
  the note below**
- Leaked-password protection: toggle in Supabase Dashboard → Auth →
  Password settings. **Verify it's currently ON** — it was enabled once
  this session but reverted at least once already (see next point).

### ⚠️ Drift risk — read before assuming anything is "fixed"

This session discovered that a full round of earlier security hardening
(admin linkage, function grants, leaked-password toggle) had silently
reverted — most likely from a Supabase project restore-from-inactive event
merging in an older schema snapshot. Symptoms included: the admin user's
`public.users` row vanishing entirely (their Supabase Auth UID had also
changed), `hash_password`/`verify_password` becoming anon-callable again,
and a duplicate legacy RLS policy set reappearing on `family_accounts`.

**Lesson:** `REVOKE ... FROM PUBLIC` is not sufficient verification. Some
functions had *direct* grants to `anon`/`authenticated` independent of
`PUBLIC` (likely from a blanket `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA
public TO anon, authenticated` run at some point). Always verify with:

```sql
SELECT grantee, privilege_type FROM information_schema.routine_privileges
WHERE routine_schema = 'public' AND routine_name = '<fn>';
```

not just `has_function_privilege`, and not just a clean `REVOKE ... FROM
PUBLIC` migration without re-checking after.

---

## 8. External Integrations

- **Africa's Talking** — USSD (`*384#` namespace, `6180` shortcode) + SMS
  (same `6180` shortcode for both send and receive). `AT_SANDBOX` env var
  toggles sandbox vs production endpoint.
- No Redis/Upstash anywhere in the stack (checked and confirmed absent).
- Jina AI embeddings + pgvector were fully phased out in favor of pg_trgm
  `word_similarity` — cheaper, sufficient for a fixed ~5-item SKU catalog,
  zero external dependency.

---

## 9. Corporate Structure

| Entity | Role |
|---|---|
| Neodawn Pte Ltd (Singapore) | IP holding, investor entity |
| NX Network Limited (Kenya) | This platform — commerce rails, USSD, ledger |
| Claw Africa (Kenya) | Separate AI subsidiary (Wakala AI, Nia AI) — not part of this codebase |
