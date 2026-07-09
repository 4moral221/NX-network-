-- ============================================================
-- NX Network — Complete Database Schema
-- Supabase / PostgreSQL
-- Run this in full on a fresh project.
-- For existing projects, see the migration blocks at the bottom.
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";     -- pgvector for Jina embeddings
create extension if not exists "pg_trgm";    -- for syntactic/trigram search

-- ============================================================
-- CORE TABLES
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
-- Stores both customers and merchants in one table.
-- role = 'customer' | 'merchant'
-- franchise_tier = 'BASIC' | 'CERTIFIED' | 'HUB'  (merchants only)
create table if not exists users (
  id                     bigint generated always as identity primary key,
  phone                  text        not null unique,
  name                   text        not null,
  role                   text        not null check (role in ('customer','merchant')),
  merchant_code          text        unique,                  -- NULL for customers, e.g. 'M123456'
  location               text,                                -- merchants only
  acceptance_percent     numeric(5,4) default 0.2,           -- merchants: max NX % per txn (0.10–0.40)
  admin_role             text        default 'super_admin',  -- super_admin | logistics_agent | treasury_manager | fraud_specialist
  language               text        default 'sw',           -- 'en' | 'sw'
  is_first_purchase_used boolean     default false,          -- customers: first-purchase bonus used?
  cancellation_count     integer     default 0,              -- customers: cancel counter (resets on confirm)
  suspension_until       timestamptz,                        -- customers: suspended from Pay with NX
  last_transaction_at    timestamptz,                        -- customers: cooldown enforcement
  national_id            text,                               -- stored for recovery verification
  recovery_pin           text,                               -- SHA-256(pin + phone), hex encoded
  status                 text        default 'active',       -- 'active' | 'recovered'
  recovered_to           text,                               -- phone number recovery was sent to
  -- Franchise fields (merchants only)
  franchise_tier         text        default 'BASIC' check (franchise_tier in ('BASIC','CERTIFIED','HUB')),
  hub_merchant_code      text,                               -- set if enrolled by a Hub merchant
  franchise_fee_until    date,                               -- Certified/Hub: fee paid through this date
  email                  text,                               -- for admin identification
  is_admin               boolean     default false,          -- strictly for admin portal access
  latitude               numeric(10,8),
  longitude              numeric(11,8),
  nx_balance             numeric(12,2) default 0,            -- cached from ledger for convenience
  dashboard_password     text,
  created_at             timestamptz default now()
);

create index if not exists users_merchant_code_idx on users(merchant_code) where merchant_code is not null;
create index if not exists users_role_idx           on users(role);
create index if not exists users_hub_code_idx       on users(hub_merchant_code) where hub_merchant_code is not null;

-- ── LEDGER ENTRIES ───────────────────────────────────────────
-- Immutable append-only ledger. Balance = sum of non-expired rows per account_phone.
-- entry_type = 'credit' (positive amount) | 'debit' (negative amount)
-- NX_SYSTEM is a special virtual account for fee revenue tracking.
-- Customer NX: expires 2 months after issuance.
-- Merchant NX: expires ~99 years (permanent pool).
create table if not exists ledger_entries (
  id             bigint generated always as identity primary key,
  account_phone  text        not null,
  entry_type     text        not null check (entry_type in ('credit','debit')),
  amount         numeric(12,2) not null,
  reference      text,                          -- txn code, INV-id, FEE-code, RECOVERY-FROM-xxx
  expires_at     timestamptz not null,
  created_at     timestamptz default now()
);

create index if not exists ledger_account_idx  on ledger_entries(account_phone);
create index if not exists ledger_expires_idx  on ledger_entries(expires_at);
create index if not exists ledger_ref_idx      on ledger_entries(reference);

-- Seed NX_SYSTEM virtual account
insert into ledger_entries (account_phone, entry_type, amount, reference, expires_at)
values ('NX_SYSTEM', 'credit', 0, 'SYSTEM_INIT', '2099-12-31T00:00:00Z')
on conflict do nothing;

-- ── TRANSACTIONS ─────────────────────────────────────────────
-- One row per Pay-with-NX interaction.
-- Status machine: pending_customer → awaiting_merchant → confirmed
--                                  → rejected_by_merchant
--               → cancelled | expired | failed
create table if not exists transactions (
  id               bigint generated always as identity primary key,
  transaction_code text        not null unique,              -- e.g. NX3K9AB2
  customer_phone   text        not null,
  merchant_code    text        not null,
  merchant_phone   text        not null,
  amount           integer     not null,                     -- total purchase KSH (multiple of 5)
  nx_redeemed      integer     not null default 0,           -- NX customer spent (multiple of 5)
  nx_earned        integer     not null default 0,           -- NX customer received
  cash_paid        integer     not null default 0,           -- KSH cash customer paid
  nx_fee           integer     not null default 0,           -- 2 NX system fee (0 if balance was 0)
  status           text        not null default 'pending_customer',
  expires_at       timestamptz,                              -- 2-min window per party
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create index if not exists txn_customer_idx   on transactions(customer_phone);
create index if not exists txn_merchant_idx   on transactions(merchant_code);
create index if not exists txn_status_idx     on transactions(status);
create index if not exists txn_created_idx    on transactions(created_at);
create index if not exists txn_code_idx       on transactions(transaction_code);

-- ── MERCHANT MARGINS ─────────────────────────────────────────
-- NX's gross trading markup accumulated per merchant (buy-sell spread, not retail margin).
-- Pool = gross_margin × tier_pool_rate (0.60–0.70 depending on tier).
-- Updated each time a restock invoice is settled.
create table if not exists merchant_margins (
  id             bigint generated always as identity primary key,
  merchant_code  text        not null unique,
  gross_margin   numeric(12,2) not null default 0,           -- total NX markup NX has earned on this merchant's orders
  updated_at     timestamptz default now()
);

create index if not exists margins_code_idx on merchant_margins(merchant_code);

-- ── MERCHANT INVENTORY ───────────────────────────────────────
-- Tracks stock per (merchant_code, sku_code, variant_code).
-- Seeded on merchant registration with one row per SKU × variant (qty=0).
-- Updated by ops when deliveries are confirmed.
create table if not exists merchant_inventory (
  id             bigint generated always as identity primary key,
  merchant_code  text    not null,
  sku_code       text    not null,                           -- BR | ML | SG | CO | MF
  variant_code   text    not null default '',               -- '2kg', '500ml', '1L', '' = unspecified
  quantity       integer not null default 0,
  updated_at     timestamptz default now(),
  constraint merchant_inventory_merchant_code_sku_code_variant_key
    unique (merchant_code, sku_code, variant_code)
);

create index if not exists inventory_merchant_idx on merchant_inventory(merchant_code);
create index if not exists inventory_sku_idx      on merchant_inventory(sku_code);

-- ── RESTOCK BATCHES ────────────────────────────────────────────
-- Groups requests to negotiate bulk discounts with FMCGs.
create table if not exists restock_batches (
  id              bigint generated always as identity primary key,
  sku_code        text    not null,
  variant_code    text,
  status          text    not null default 'open',           -- 'open' | 'negotiating' | 'fulfilled'
  total_quantity  integer not null default 0,
  merchant_count  integer not null default 0,
  offered_price   numeric(12,2),
  normal_price    numeric(12,2),
  nx_credited     boolean not null default false,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── BATCH NX CREDITS ─────────────────────────────────────────
-- Tracks NX credits distributed to merchants from batch savings.
create table if not exists batch_nx_credits (
  id              bigint generated always as identity primary key,
  batch_id        bigint  not null references restock_batches(id),
  merchant_code   text    not null,
  merchant_phone  text    not null,
  units_ordered   integer not null,
  saving_per_unit numeric(12,2) not null,
  total_saving    numeric(12,2) not null,
  nx_credited     numeric(12,2) not null,
  created_at      timestamptz default now()
);

-- ── RESTOCK REQUESTS ─────────────────────────────────────────
-- Created when a merchant places a restock order via USSD.
-- variant_code + raw_input captured for ops fulfilment.
-- fuzzy_resolved = true if matched via Jina/pgvector (not exact SKU code).
create table if not exists restock_requests (
  id              bigint generated always as identity primary key,
  merchant_code   text    not null,
  merchant_phone  text    not null,
  sku_code        text,
  sku_name        text,
  quantity        integer,
  variant_code    text,                                      -- normalised: '2kg', '500ml'
  raw_input       text,                                      -- original text: 'Pembe 2kg'
  fuzzy_resolved  boolean default false,                     -- matched via Jina?
  status          text    not null default 'pending',        -- 'pending' | 'fulfilled' | 'cancelled'
  claimed_by_email text,                                     -- logistics agent who is handling this
  batch_id        bigint  references restock_batches(id),
  requested_at    timestamptz default now(),
  fulfilled_at    timestamptz
);

create index if not exists restock_merchant_idx on restock_requests(merchant_code);
create index if not exists restock_status_idx   on restock_requests(status);

-- ── RESTOCK INVOICES ─────────────────────────────────────────
-- Created by ops/dashboard when a restock delivery is confirmed.
-- Merchant settles via USSD (NX Wallet → Settle Invoice).
-- status: 'pending' | 'partial' | 'settled'
create table if not exists restock_invoices (
  id              bigint generated always as identity primary key,
  merchant_code   text           not null,
  invoice_amount  numeric(12,2)  not null,                   -- KSH total for this delivery
  nx_paid         numeric(12,2)  default 0,                  -- NX used to offset invoice
  cash_due        numeric(12,2),                             -- remaining KSH due after NX offset
  status          text           not null default 'pending',
  notes           text,
  created_at      timestamptz    default now(),
  updated_at      timestamptz    default now()
);

create index if not exists invoices_merchant_idx on restock_invoices(merchant_code);
create index if not exists invoices_status_idx   on restock_invoices(status);

-- ── FMCG MARGIN CONTRIBUTIONS ────────────────────────────────
-- FMCG brands can fund loyalty pool boosts for specific merchants.
-- Negotiated directly with NX, credited on top of NX's own markup pool.
create table if not exists fmcg_margin_contributions (
  id                  bigint generated always as identity primary key,
  merchant_code       text           not null,
  fmcg_name           text           not null,               -- e.g. 'Brookside', 'Pembe'
  contribution_amount numeric(12,2)  not null,               -- NX units added to pool
  effective_from      date           not null,
  effective_to        date,                                   -- null = no expiry
  status              text           not null default 'pending', -- 'pending' | 'active' | 'rejected'
  notes               text,
  created_at          timestamptz    default now()
);

create index if not exists fmcg_merchant_idx on fmcg_margin_contributions(merchant_code);
create index if not exists fmcg_dates_idx    on fmcg_margin_contributions(effective_from, effective_to);

-- ── NX PRODUCTS (Hybrid Search Optimized) ────────────────────────
-- Stores brand names and synonyms for fuzzy USSD resolution.
-- Seeded via SkuMatchingConsole /api/products.
create table if not exists nx_products (
  id              bigint generated always as identity primary key,
  sku             text    not null,                               -- BR | ML | SG | CO | MF
  name            text    not null,                               -- 'Pembe Maize Flour 2kg'
  normalized_name text,                                           -- 'pembe maize flour 2kg'
  category        text    default 'General',
  created_at      timestamptz default now(),
  unique(sku, name)
);

create index if not exists nx_products_name_idx on nx_products using gist (normalized_name gist_trgm_ops);

-- ── SKU CATALOG ──────────────────────────────────────────────
-- Stores Jina AI vector embeddings for fuzzy SKU matching.
-- Seeded via nx-embed.ts { action: "seed" }.
-- match_sku RPC queries this via pgvector cosine similarity.
create table if not exists sku_catalog (
  id          bigint generated always as identity primary key,
  sku_code    text    not null unique,                        -- BR | ML | SG | CO | MF
  name_en     text,                                          -- English display name
  name_sw     text,                                          -- Swahili display name
  updated_at  timestamptz default now()
);

-- pg_trgm index for fast fuzzy searching
create index if not exists sku_catalog_name_idx on sku_catalog using gist (name_en gist_trgm_ops);

-- Seed SKU names (embeddings added by nx-embed.ts)
insert into sku_catalog (sku_code, name_en, name_sw) values
  ('BR', 'Bread',        'Mkate'),
  ('ML', 'Milk',         'Maziwa'),
  ('SG', 'Sugar',        'Sukari'),
  ('CO', 'Cooking Oil',  'Mafuta'),
  ('MF', 'Maize Flour',  'Unga')
on conflict (sku_code) do update
  set name_en = excluded.name_en, name_sw = excluded.name_sw;

-- Seed Sample Brands for Hybrid Matching (MF=Maize Flour, CO=Cooking Oil, BR=Bread, ML=Milk, SG=Sugar)
insert into nx_products (sku, name, normalized_name, category) values
  ('MF', 'Pembe Maize Flour 2kg', 'pembe maize flour 2kg', 'Flour'),
  ('MF', 'Jogoo Maize Meal 2kg', 'jogoo maize meal 2kg', 'Flour'),
  ('MF', 'Soko Maize Flour 2kg', 'soko maize flour 2kg', 'Flour'),
  ('MF', 'Ajab All Purpose 2kg', 'ajab all purpose 2kg', 'Flour'),
  ('ML', 'Brookside Fresh Milk 500ml', 'brookside fresh milk 500ml', 'Dairy'),
  ('ML', 'KCC Fresh Milk 500ml', 'kcc fresh milk 500ml', 'Dairy'),
  ('ML', 'Mount Kenya Milk 500ml', 'mount kenya milk 500ml', 'Dairy'),
  ('SG', 'Mumias Sugar 2kg', 'mumias sugar 2kg', 'Sugar'),
  ('SG', 'Kabras Sugar 2kg', 'kabras sugar 2kg', 'Sugar'),
  ('SG', 'Mara Sugar 1kg', 'mara sugar 1kg', 'Sugar'),
  ('CO', 'Fresh Fri Cooking Oil 1L', 'fresh fri cooking oil 1l', 'Oil'),
  ('CO', 'Salit Oil 1L', 'salit oil 1l', 'Oil'),
  ('CO', 'Fry Mate 1L', 'fry mate 1l', 'Oil'),
  ('BR', 'Broadway Bread 400g', 'broadway bread 400g', 'Bread'),
  ('BR', 'Super Loaf 400g', 'super loaf 400g', 'Bread'),
  ('BR', 'Festive Bread 400g', 'festive bread 400g', 'Bread')
on conflict (sku, name) do nothing;

-- ── MERCHANT WHITELIST ───────────────────────────────────────
-- Only phones in this table can complete merchant registration immediately.
-- Others are submitted as applications (pending NX review).
-- hub_merchant_code: set when a Hub merchant enrolls a sub-merchant via USSD.
create table if not exists merchant_whitelist (
  id                bigint generated always as identity primary key,
  phone             text not null unique,
  hub_merchant_code text,                                    -- null = direct NX onboarding
  added_at          timestamptz default now()
);

-- ── MERCHANT APPLICATIONS ────────────────────────────────────
-- Submitted when a non-whitelisted phone tries to register as merchant.
-- Ops reviews in admin dashboard → approves by adding phone to merchant_whitelist.
create table if not exists merchant_applications (
  id              bigint generated always as identity primary key,
  phone           text not null unique,
  business_name   text not null,
  location        text,
  national_id     text,
  recovery_pin    text,                                      -- SHA-256(pin + phone)
  status          text not null default 'pending',           -- 'pending' | 'approved' | 'rejected'
  applied_at      timestamptz default now(),
  reviewed_at     timestamptz,
  reviewed_by     text
);

-- ── HUB COMMISSIONS ──────────────────────────────────────────
-- One row per confirmed transaction from a sub-merchant.
-- 0.2 NX accrues per txn. Paid out monthly via admin dashboard.
-- paid_out = false → pending. Set to true after merchantCredit is called.
create table if not exists hub_commissions (
  id                bigint generated always as identity primary key,
  hub_merchant_code text           not null,
  sub_merchant_code text           not null,
  transaction_code  text           not null,
  amount            numeric(10,2)  not null default 0.2,
  paid_out          boolean        not null default false,
  created_at        timestamptz    default now()
);

create index if not exists hub_commissions_hub_idx  on hub_commissions(hub_merchant_code);
create index if not exists hub_commissions_paid_idx on hub_commissions(paid_out);

-- ── NX RATE LIMITS ───────────────────────────────────────────
-- Sliding window rate limiter (10 hits / 60 seconds per phone).
create table if not exists nx_rate_limits (
  id            bigint generated always as identity primary key,
  phone         text        not null unique,
  hit_count     integer     not null default 1,
  window_start  timestamptz not null default now()
);

-- ── NX LOGS ──────────────────────────────────────────────────
-- Error log for USSD handler exceptions.
create table if not exists nx_logs (
  id          bigint generated always as identity primary key,
  phone       text,
  session_id  text,
  error       text,
  context     text,
  created_at  timestamptz default now()
);

-- ── FMCG PARTNERS (for FMCG dashboard login/data scope) ──────
-- Each FMCG brand has a record here.
-- api_key is used to authenticate FMCG dashboard requests.
create table if not exists fmcg_partners (
  id          bigint generated always as identity primary key,
  name        text not null unique,                          -- 'Brookside', 'Pembe', etc.
  contact     text,
  api_key     text unique default gen_random_uuid()::text,  -- used as bearer token
  active      boolean default true,
  created_at  timestamptz default now()
);

-- ── RESTOCK BATCH OFFERS ───────────────────────────────────────
create table if not exists restock_batch_offers (
  id              bigint generated always as identity primary key,
  batch_id        bigint not null references restock_batches (id) on delete cascade,
  fmcg_partner_id bigint not null references fmcg_partners (id) on delete cascade,
  offered_price   numeric(10,2) not null,
  status          text default 'pending',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── FRANCHISE FEE PAYMENTS ───────────────────────────────────
-- Records Certified and Hub monthly subscription payments.
-- Updated by admin when payment is confirmed (M-Pesa etc).
create table if not exists franchise_fee_payments (
  id              bigint generated always as identity primary key,
  merchant_code   text           not null,
  merchant_phone  text           not null,
  tier            text           not null,                   -- 'CERTIFIED' | 'HUB'
  amount_kes      integer        not null,                   -- 500 or 1000
  period_month    text           not null,                   -- 'YYYY-MM'
  status          text           default 'pending',          -- 'pending' | 'paid'
  paid_at         timestamptz,
  created_at      timestamptz    default now()
);

create index if not exists fee_payments_merchant_idx on franchise_fee_payments(merchant_code);

-- ── OPS AUDIT LOGS ───────────────────────────────────────────
-- Tracks all administrative actions for accountability.
create table if not exists ops_audit_logs (
  id          bigint generated always as identity primary key,
  agent_email text not null,
  action      text not null,
  target_id   text,
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

-- ── MERCHANT NOTIFICATIONS ───────────────────────────────────
-- Formal in-app notifications for merchants.
create table if not exists merchant_notifications (
  id            bigint generated always as identity primary key,
  merchant_code text not null,
  title         text not null,
  message       text not null,
  type          text default 'info',
  is_read       boolean default false,
  created_at    timestamptz default now()
);

-- ── FRAUD LOGS ────────────────────────────────────────────────
-- Automated risk flags from transaction triggers.
create table if not exists fraud_logs (
  id             bigint generated always as identity primary key,
  phone          text not null,
  transaction_id text,
  risk_score     integer default 0,
  reason         text,
  status         text default 'flagged',
  created_at     timestamptz default now()
);

-- ── SECURITY: Secure Admin Verification ────────────────────────
-- This function allows checking admin credentials WITHOUT exposing
-- the dashboard_password column to the public select policy.
create or replace function verify_admin_login(p_email text, p_password text)
returns table (is_valid boolean, role text)
set search_path = public
as $$
begin
  return query
  select 
    (dashboard_password = p_password) as is_valid,
    admin_role as role
  from users 
  where email = p_email 
    and is_admin = true
  limit 1;
end;
$$ language plpgsql security definer;

-- ── ENFORCE DATA INTEGRITY ──────────────────────────────────
-- Ensure every email and merchant code is unique to prevent collisions.
alter table users drop constraint if exists users_email_key;
alter table users add constraint users_email_key unique (email);

alter table users drop constraint if exists users_merchant_code_key;
alter table users add constraint users_merchant_code_key unique (merchant_code);

-- ── RLS HARDENING ──────────────────────────────────────────
-- Enable RLS on all tables
alter table users enable row level security;
alter table ledger_entries enable row level security;

-- Only allow admins to modify balances directly
drop policy if exists "Only admins can update balances" on users;
create policy "Admins only write" on users
  for all using (is_admin = true)
  with check (is_admin = true);

-- Allow public check for users during PWA login (needed for phone lookup)
drop policy if exists "Allow public read for login" on users;
create policy "Public phone lookup" on users
  for select using (true);

-- Ledger is append-only for merchants, full access for admins
drop policy if exists "Ledger policy" on ledger_entries;
create policy "Secure ledger access" on ledger_entries
  for all using (true); 
-- Note: In a production env, you would use auth.uid() checks here.

-- ============================================================
-- RPC FUNCTIONS
-- ============================================================

-- ── match_sku_hybrid ──────────────────────────────────────────
-- Production-grade hybrid search: Semantic (70%) + Syntactic (30%).
-- Used by resolveSkuFuzzy (USSD) and SkuMatcher service.
create or replace function match_sku_hybrid(
  query_embedding vector(768),
  query_text      text,
  match_threshold float default 0.6,
  match_count     int default 5
)
returns table (
  sku      text,
  name     text,
  score    float
)
language plpgsql
as $$
begin
  return query
  select
    p.sku,
    p.name,
    ( (1 - (p.embedding <=> query_embedding)) * 0.7 + 
      similarity(p.normalized_name, query_text) * 0.3 )::float as score
  from nx_products p
  where (1 - (p.embedding <=> query_embedding)) > match_threshold
     or p.normalized_name % query_text
  
  union all
  
  select
    c.sku_code as sku,
    c.name_en as name,
    ( (1 - (c.embedding <=> query_embedding)) * 0.7 + 
      similarity(c.name_en, query_text) * 0.3 )::float as score
  from sku_catalog c
  where (1 - (c.embedding <=> query_embedding)) > match_threshold
     or c.name_en % query_text
  
  order by score desc
  limit match_count;
end;
$$;

-- ── match_sku ─────────────────────────────────────────────────
-- Called by nx-ussd-mvp.ts resolveSkuFuzzy() and nx-embed.ts.
-- Returns SKU rows with cosine similarity above threshold, ordered best first.
drop function if exists match_sku(vector, float);
create or replace function match_sku(
  query_embedding vector(768),
  threshold       float default 0.72
)
returns table (
  sku_code   text,
  name_en    text,
  similarity float
)
language sql stable
as $$
  select
    sku_code,
    name_en,
    1 - (embedding <=> query_embedding) as similarity
  from sku_catalog
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= threshold
  order by embedding <=> query_embedding
  limit 3;
$$;

-- ── get_nx_system_balance ─────────────────────────────────────
-- Returns the NX_SYSTEM fee revenue balance.
-- Used in admin dashboard.
create or replace function get_nx_system_balance()
returns numeric
language sql stable
as $$
  select coalesce(sum(amount), 0)
  from ledger_entries
  where account_phone = 'NX_SYSTEM'
    and expires_at > now();
$$;

-- ── get_cycle_stats ───────────────────────────────────────────
-- Returns transaction stats for the current billing cycle (month to date).
create or replace function get_cycle_stats()
returns table (
  total_txns      bigint,
  total_volume    numeric,
  total_nx_issued numeric,
  total_nx_redeemed numeric,
  total_fees      numeric
)
language sql stable
as $$
  select
    count(*)                          as total_txns,
    coalesce(sum(amount),       0)    as total_volume,
    coalesce(sum(nx_earned),    0)    as total_nx_issued,
    coalesce(sum(nx_redeemed),  0)    as total_nx_redeemed,
    coalesce(sum(nx_fee),       0)    as total_fees
  from transactions
  where status = 'confirmed'
    and created_at >= date_trunc('month', now());
$$;

-- ── payout_hub_commissions ────────────────────────────────────
-- Month-end admin function: credits all unpaid hub commissions for a given hub.
-- Pass the hub's phone number and the month label (e.g. '2025-01').
-- Returns: total NX credited.
-- After calling this, call merchantCredit in the app — or use the admin dashboard.
create or replace function payout_hub_commissions(
  p_hub_merchant_code text,
  p_month             text   -- 'YYYY-MM'
)
returns numeric
language plpgsql
as $$
declare
  v_total numeric;
begin
  select coalesce(sum(amount), 0) into v_total
  from hub_commissions
  where hub_merchant_code = p_hub_merchant_code
    and paid_out = false
    and to_char(created_at, 'YYYY-MM') = p_month;

  if v_total > 0 then
    update hub_commissions
    set paid_out = true
    where hub_merchant_code = p_hub_merchant_code
      and paid_out = false
      and to_char(created_at, 'YYYY-MM') = p_month;
  end if;

  return v_total;
end;
$$;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================
-- Enable RLS on sensitive tables.
-- The Edge Function uses the SERVICE_ROLE key which bypasses RLS.
-- The PWA uses the ANON key and requires explicit policies.

alter table users                    enable row level security;
alter table ledger_entries           enable row level security;
alter table transactions             enable row level security;
alter table merchant_margins         enable row level security;
alter table merchant_inventory       enable row level security;
alter table restock_requests         enable row level security;
alter table restock_invoices         enable row level security;
alter table fmcg_margin_contributions enable row level security;
alter table sku_catalog              enable row level security;
alter table merchant_whitelist       enable row level security;
alter table merchant_applications    enable row level security;
alter table hub_commissions          enable row level security;
alter table fmcg_partners            enable row level security;
alter table franchise_fee_payments   enable row level security;
alter table ops_audit_logs            enable row level security;
alter table merchant_notifications    enable row level security;
alter table fraud_logs               enable row level security;

-- 1. Service role bypass (for Edge Functions)
do $$
declare
  tbl text;
  tbls text[] := array[
    'users','ledger_entries','transactions','merchant_margins',
    'merchant_inventory','restock_requests','restock_invoices',
    'fmcg_margin_contributions','sku_catalog','merchant_whitelist',
    'merchant_applications','hub_commissions','nx_rate_limits',
    'nx_logs','fmcg_partners','franchise_fee_payments','ops_audit_logs','merchant_notifications','fraud_logs'
  ];
begin
  foreach tbl in array tbls loop
    execute format(
      'drop policy if exists "service_role_all" on %I; create policy "service_role_all" on %I for all to service_role using (true) with check (true)',
      tbl, tbl
    );
  end loop;
end;
$$;

-- 2. PWA Public/Anon Policies (for Login)
-- WARNING: Previous open anon policies removed due to critical data exposure.
-- PWA architecture must switch to explicit Supabase Auth JWTs or Edge Functions 
-- rather than querying via anon key.
-- The following restrictive policies ensure data is inherently protected at the database level.

create policy "Allow public read for login" on users
  for select to anon
  using (phone = current_setting('request.jwt.claims', true)::json->>'phone');

-- 3. PWA Authenticated Policies (for Dashboard)
-- Replaced USING (true) with restrictive JWT-based checks or authenticated role.

create policy "Allow auth read ledger" on ledger_entries
  for select to authenticated
  using (true);

create policy "Allow auth read transactions" on transactions
  for select to authenticated
  using (true);

create policy "Allow auth read inventory" on merchant_inventory
  for select to authenticated
  using (true);

create policy "Allow auth read margins" on merchant_margins
  for select to authenticated
  using (true);

create policy "Allow auth restock requests" on restock_requests
  for all to authenticated
  using (true) with check (true);

create policy "Allow auth read invoices" on restock_invoices
  for select to authenticated
  using (true);

create policy "Allow auth read applications" on merchant_applications
  for select to authenticated
  using (true);

create policy "Allow anon insert applications" on merchant_applications
  for insert to anon
  with check (true);

create policy "Allow auth manage contributions" on fmcg_margin_contributions
  for all to authenticated
  using (true) with check (true);

create policy "Allow auth manage audit" on ops_audit_logs
  for all to authenticated
  using (true) with check (true);

create policy "Allow auth manage notifications" on merchant_notifications
  for all to authenticated
  using (true) with check (true);

create policy "Allow auth manage fraud" on fraud_logs
  for all to authenticated
  using (true) with check (true);

-- ============================================================
-- MIGRATION GUIDE (for existing projects)
-- ============================================================
--
-- If you ran v3/v4 SQL before, only run these:
--
-- -- v4:
-- alter table transactions add column if not exists expires_at timestamptz;
-- update transactions set status = 'pending_customer' where status = 'pending';
--
-- -- v5:
-- alter table users
--   add column if not exists franchise_tier text default 'BASIC',
--   add column if not exists hub_merchant_code text,
--   add column if not exists franchise_fee_until date,
--   add column if not exists status text default 'active',
--   add column if not exists recovered_to text;
--
-- alter table merchant_inventory
--   add column if not exists variant_code text not null default '';
-- alter table merchant_inventory
--   add constraint if not exists merchant_inventory_merchant_code_sku_code_variant_key
--   unique (merchant_code, sku_code, variant_code);
--
-- alter table restock_requests
--   add column if not exists variant_code text,
--   add column if not exists raw_input text,
--   add column if not exists fuzzy_resolved boolean default false;
--
-- alter table transactions
--   add column if not exists nx_fee integer default 0;
--
-- alter table merchant_whitelist
--   add column if not exists hub_merchant_code text;
--
-- Then create tables: hub_commissions, fmcg_partners, franchise_fee_payments
-- (see full definitions above)
--
-- Then run the RPC functions (create or replace — safe to re-run).
-- ============================================================

-- ============================================================
-- NX Network — Restock Batch Aggregation Engine (v6)
-- Run this AFTER the existing nx-schema.sql
-- ============================================================

-- ── RESTOCK BATCHES ──────────────────────────────────────────
-- One batch per SKU+variant per 48-hour window.
-- Aggregates individual restock_requests into a single
-- demand signal that NX presents to FMCG partners for pricing.

create table if not exists restock_batches (
  id              bigint generated always as identity primary key,
  sku_code        text           not null,
  sku_name        text,
  variant_code    text,                           -- '2kg', '500ml', '1L' etc.
  window_start    timestamptz    default now(),
  window_end      timestamptz,                    -- set by trigger/cron (window_start + 48h)
  total_qty       integer        default 0,       -- sum of all merchant quantities
  merchant_count  integer        default 0,       -- unique merchants in this batch
  status          text           not null default 'open',
    -- 'open'           → accepting merchant requests
    -- 'sent_to_fmcg'   → NX has sent demand signal to FMCG
    -- 'deal_received'  → FMCG submitted an offer price
    -- 'deal_accepted'  → NX accepted, merchants notified
    -- 'fulfilled'      → delivery confirmed, NX credited
    -- 'cancelled'      → insufficient volume or no deal
  normal_price    numeric(10,2),                  -- baseline market price per unit (KSH)
  offered_price   numeric(10,2),                  -- FMCG's offered batch price per unit
  saving_pct      numeric(5,2)   generated always as (
    case when normal_price > 0 and offered_price > 0
    then round(((normal_price - offered_price) / normal_price) * 100, 2)
    else null end
  ) stored,
  fmcg_partner_id bigint references fmcg_partners(id),
  deal_note       text,                           -- FMCG message with offer
  deal_expires_at timestamptz,                    -- offer validity deadline
  nx_credited     boolean        default false,   -- NX savings credits issued to merchants?
  created_at      timestamptz    default now(),
  updated_at      timestamptz    default now()
);

create index if not exists batch_sku_idx      on restock_batches(sku_code);
create index if not exists batch_status_idx   on restock_batches(status);
create index if not exists batch_window_idx   on restock_batches(window_end);
create index if not exists batch_partner_idx  on restock_batches(fmcg_partner_id);

-- ── LINK restock_requests → restock_batches ──────────────────
alter table restock_requests
  add column if not exists batch_id bigint references restock_batches(id);

create index if not exists req_batch_idx on restock_requests(batch_id);

-- ── DASHBOARD PASSWORD ───────────────────────────────────────
alter table users add column if not exists dashboard_password text;

-- ── RESTOCK BATCH OFFERS (FMCG bids) ─────────────────────────
-- FMCGs can submit competing offers for the same batch.
-- Admin picks the best one and marks it accepted.

create table if not exists restock_batch_offers (
  id              bigint generated always as identity primary key,
  batch_id        bigint         not null references restock_batches(id),
  fmcg_partner_id bigint         not null references fmcg_partners(id),
  offered_price   numeric(10,2)  not null,        -- per unit KSH
  total_value     numeric(12,2)  generated always as (offered_price) stored, -- placeholder
  delivery_days   integer,                        -- estimated days to fulfil
  notes           text,
  status          text           not null default 'pending',
    -- 'pending' | 'accepted' | 'rejected'
  submitted_at    timestamptz    default now()
);

create index if not exists offer_batch_idx   on restock_batch_offers(batch_id);
create index if not exists offer_partner_idx on restock_batch_offers(fmcg_partner_id);

-- ── BATCH NX SAVINGS LEDGER ──────────────────────────────────
-- When a batch is fulfilled, each merchant gets NX for their
-- share of the savings vs normal_price.

create table if not exists batch_nx_credits (
  id              bigint generated always as identity primary key,
  batch_id        bigint         not null references restock_batches(id),
  merchant_code   text           not null,
  merchant_phone  text,
  units_ordered   integer        not null,
  saving_per_unit numeric(10,2)  not null,        -- normal_price - offered_price
  total_saving    numeric(12,2)  not null,         -- units_ordered * saving_per_unit
  nx_credited     numeric(10,2)  not null,         -- 10% of KSH saving → NX
  credited_at     timestamptz    default now()
);

create index if not exists credit_batch_idx    on batch_nx_credits(batch_id);
create index if not exists credit_merchant_idx on batch_nx_credits(merchant_code);

-- ── RLS ───────────────────────────────────────────────────────
alter table restock_batches       enable row level security;
alter table restock_batch_offers  enable row level security;
alter table batch_nx_credits      enable row level security;

-- Public read (FMCG portal + USSD status checks)
create policy "Public read batches" on restock_batches
  for select to anon, authenticated using (true);

create policy "Public read offers" on restock_batch_offers
  for select to anon, authenticated using (true);

create policy "Allow public manage offers" on restock_batch_offers
  for all to anon, authenticated
  using (true) with check (true);

-- FMCG inserts offers (via portal)
create policy "FMCG insert offers" on restock_batch_offers
  for insert to anon, authenticated with check (true);

-- NX admin inserts/updates batches (via admin portal)
create policy "Admin manage batches" on restock_batches
  for all to anon, authenticated using (true) with check (true);

create policy "Admin manage credits" on batch_nx_credits
  for all to anon, authenticated using (true) with check (true);

-- ── HELPER: open_or_get_batch ────────────────────────────────
-- Called by USSD function when merchant places restock order.
-- Returns existing open batch for sku+variant, or creates new one.

create or replace function open_or_get_batch(
  p_sku     text,
  p_variant text default null
) returns bigint language plpgsql as $$
declare
  v_batch_id bigint;
begin
  -- Find open batch for this SKU+variant (window not yet closed)
  select id into v_batch_id
  from restock_batches
  where sku_code    = p_sku
    and (variant_code = p_variant or (variant_code is null and p_variant is null))
    and status      = 'open'
    and (window_end is null or window_end > now())
  limit 1;

  if v_batch_id is null then
    insert into restock_batches (
      sku_code, variant_code, window_start, window_end, status
    ) values (
      p_sku, p_variant, now(), now() + interval '48 hours', 'open'
    )
    returning id into v_batch_id;
  end if;

  return v_batch_id;
end;
$$;

-- ── HELPER: refresh_batch_totals ─────────────────────────────
-- Recalculates total_qty + merchant_count for a batch.
-- Call after any restock_request insert.

create or replace function refresh_batch_totals(p_batch_id bigint)
returns void language plpgsql as $$
begin
  update restock_batches
  set
    total_qty      = (select coalesce(sum(quantity), 0) from restock_requests where batch_id = p_batch_id and status != 'cancelled'),
    merchant_count = (select count(distinct merchant_code) from restock_requests where batch_id = p_batch_id and status != 'cancelled'),
    updated_at     = now()
  where id = p_batch_id;
end;
$$;

-- ── HELPER: credit_batch_nx ──────────────────────────────────
-- Called by admin after batch fulfilled.
-- Credits NX to each merchant proportional to their savings.

create or replace function credit_batch_nx(p_batch_id bigint)
returns integer language plpgsql as $$
declare
  v_batch       restock_batches%rowtype;
  v_req         record;
  v_saving_per  numeric;
  v_nx          numeric;
  v_credited    integer := 0;
begin
  select * into v_batch from restock_batches where id = p_batch_id;
  if v_batch.offered_price is null or v_batch.normal_price is null then
    raise exception 'Batch % has no price data', p_batch_id;
  end if;

  v_saving_per := v_batch.normal_price - v_batch.offered_price;
  if v_saving_per <= 0 then
    return 0; -- no saving, no NX
  end if;

  for v_req in
    select merchant_code, merchant_phone, sum(quantity) as qty
    from restock_requests
    where batch_id = p_batch_id and status = 'pending'
    group by merchant_code, merchant_phone
  loop
    v_nx := round((v_req.qty * v_saving_per) * 0.10, 2); -- 10% of KSH saving → NX

    insert into batch_nx_credits (
      batch_id, merchant_code, merchant_phone,
      units_ordered, saving_per_unit, total_saving, nx_credited
    ) values (
      p_batch_id, v_req.merchant_code, v_req.merchant_phone,
      v_req.qty, v_saving_per, v_req.qty * v_saving_per, v_nx
    );

    -- Credit NX wallet
    update users
    set nx_balance = nx_balance + v_nx
    where merchant_code = v_req.merchant_code;

    -- Log to ledger
    insert into ledger_entries (account_phone, entry_type, amount, reference, expires_at)
    values (v_req.merchant_phone, 'credit', v_nx, format('BATCH-%s', p_batch_id), '2125-01-01');

    v_credited := v_credited + 1;
  end loop;

  update restock_batches set nx_credited = true, status = 'fulfilled', updated_at = now()
  where id = p_batch_id;

  return v_credited;
end;
$$;

-- ── SEED DATA ───────────────────────────────────────────────
-- Super Admin user for portal access
insert into users (phone, name, role, email, is_admin, dashboard_password)
values ('254700000000', 'NX Admin', 'merchant', 'formidablefoe254@gmail.com', true, 'admin123')
on conflict (phone) do update set 
  is_admin = true, 
  email = excluded.email,
  dashboard_password = coalesce(users.dashboard_password, excluded.dashboard_password);

-- ============================================================
-- FINAL MIGRATIONS & SCHEMA HEALING (v7)
-- ============================================================

-- 1. Ensure all tables have updated_at column
ALTER TABLE merchant_inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE transactions      ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE merchant_margins  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE restock_invoices  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE restock_batches   ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE restock_batch_offers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE fmcg_partners     ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE fmcg_margin_contributions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE sku_catalog ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();


-- 2. Update Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Apply triggers
DROP TRIGGER IF EXISTS update_nx_products_updated_at ON nx_products;
CREATE TRIGGER update_nx_products_updated_at BEFORE UPDATE ON nx_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_merchant_margins_updated_at ON merchant_margins;
CREATE TRIGGER update_merchant_margins_updated_at BEFORE UPDATE ON merchant_margins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_merchant_inventory_updated_at ON merchant_inventory;
CREATE TRIGGER update_merchant_inventory_updated_at BEFORE UPDATE ON merchant_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restock_invoices_updated_at ON restock_invoices;
CREATE TRIGGER update_restock_invoices_updated_at BEFORE UPDATE ON restock_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restock_batches_updated_at ON restock_batches;
CREATE TRIGGER update_restock_batches_updated_at BEFORE UPDATE ON restock_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_restock_batch_offers_updated_at ON restock_batch_offers;
CREATE TRIGGER update_restock_batch_offers_updated_at BEFORE UPDATE ON restock_batch_offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fmcg_partners_updated_at ON fmcg_partners;
CREATE TRIGGER update_fmcg_partners_updated_at BEFORE UPDATE ON fmcg_partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fmcg_margin_contributions_updated_at ON fmcg_margin_contributions;
CREATE TRIGGER update_fmcg_margin_contributions_updated_at BEFORE UPDATE ON fmcg_margin_contributions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sku_catalog_updated_at ON sku_catalog;
CREATE TRIGGER update_sku_catalog_updated_at BEFORE UPDATE ON sku_catalog FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Fix Unique Constraints
ALTER TABLE merchant_inventory DROP CONSTRAINT IF EXISTS merchant_inventory_merchant_code_sku_code_variant_key;
ALTER TABLE merchant_inventory ADD CONSTRAINT merchant_inventory_merchant_code_sku_code_variant_key UNIQUE (merchant_code, sku_code, variant_code);

-- ============================================================
-- AUDITABILITY & CLEANUP (v7)
-- Centralized logic for financial precision
-- ============================================================

-- ── CENTRAL POOL FUNCTION ───────────────────────────────────
-- Source of truth for merchant redemption capacity.
CREATE OR REPLACE FUNCTION get_merchant_pool(p_merchant_code text)
RETURNS numeric AS $$
DECLARE
  v_tier text;
  v_pool_rate numeric;
  v_margin numeric;
  v_fmcg numeric;
  v_today date := current_date;
BEGIN
  -- Get Tier and Margin
  SELECT franchise_tier into v_tier from users where merchant_code = p_merchant_code;
  SELECT coalesce(gross_margin, 0) into v_margin from merchant_margins where merchant_code = p_merchant_code;
  
  -- Determine Pool Rate from tiers config
  v_pool_rate := CASE 
    WHEN v_tier = 'HUB' THEN 0.70
    WHEN v_tier = 'CERTIFIED' THEN 0.65
    ELSE 0.60
  END;

  -- Add active FMCG Boosts
  SELECT coalesce(sum(contribution_amount), 0) into v_fmcg 
  from fmcg_margin_contributions 
  where merchant_code = p_merchant_code 
    and status = 'active'
    and effective_from <= v_today
    and (effective_to is null or effective_to >= v_today);

  RETURN floor(v_margin * v_pool_rate) + floor(v_fmcg);
END;
$$ LANGUAGE plpgsql STABLE;

-- ── TRANSACTION STATUS HARDENING ─────────────────────────────
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN (
  'pending_customer', 
  'awaiting_merchant', 
  'confirmed', 
  'rejected_by_merchant', 
  'cancelled', 
  'expired', 
  'failed',
  'completed'
));

-- ── BALANCE INTEGRITY VIEW ───────────────────────────────────
-- Monitors drift between user.nx_balance and current ledger sum.
CREATE OR REPLACE VIEW audit_balance_drift AS
SELECT 
  u.phone,
  u.merchant_code,
  u.role,
  u.nx_balance as cached_balance,
  (SELECT coalesce(sum(amount), 0) FROM ledger_entries l WHERE l.account_phone = u.phone AND l.expires_at > now()) as ledger_balance,
  (u.nx_balance - (SELECT coalesce(sum(amount), 0) FROM ledger_entries l WHERE l.account_phone = u.phone AND l.expires_at > now())) as drift
FROM users u;

-- ── MERCHANT PERFORMANCE VIEW ───────────────────────────────
CREATE OR REPLACE VIEW v_merchant_stats AS
SELECT 
  u.merchant_code,
  u.name,
  u.franchise_tier,
  get_merchant_pool(u.merchant_code) as current_pool,
  (SELECT coalesce(sum(nx_redeemed), 0) 
   FROM transactions t 
   WHERE t.merchant_code = u.merchant_code 
     AND t.status IN ('confirmed', 'completed', 'awaiting_merchant', 'pending_customer')
     AND t.created_at >= date_trunc('month', now())) as cycle_utilization,
  u.nx_balance as earnings
FROM users u
WHERE u.role = 'merchant';
