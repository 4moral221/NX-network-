# CLAUDE.md — Agent Operating Guide for NX Network

This file scopes how an AI agent (Claude or otherwise) should work on this
codebase. Read this before making any schema change, edge function deploy,
or architectural decision. Pair with `PROJECT.md` for what the system does;
this file is about *how to safely change it*.

---

## 0. The one rule that matters most

**Verify against the live Supabase project, never against memory, the repo
export, or a prior session's summary.** This codebase has drifted from its
own documentation more than once already — a project restore event silently
reverted a full round of security hardening mid-session. Assume nothing is
"already fixed" until you've queried it live, this turn.

---

## 1. Ground-truth facts (verified, safe to trust)

- SKU code for flour is **`F`**, not `MF`. Duplicates (`FL`, `MF`, `OL`)
  were confirmed and deleted from `sku_catalog` this session.
- `sku_catalog` uses `name_en` / `name_sw` columns — there is no generic
  `name` column. Check before writing any query against it.
- Admin authorization is `users.is_admin = true`, checked in nearly every
  RLS policy as `EXISTS (SELECT 1 FROM users WHERE id::text =
  (SELECT auth.uid())::text AND is_admin = true)`. The `admin_users` table
  is a companion roster, **not** the authorization mechanism — don't gate
  anything on its existence alone.
- All partner types (fmcg, wholesaler, logistics) live in **one** table:
  `fmcg_partners`, discriminated by `partner_type`. There is no separate
  `partners` table — it was confirmed empty and dropped.
- `wholesaler_id` / `assigned_partner_id` columns reference
  `fmcg_partners.id`, not any other table.

## 1a. Unresolved — do not assume, ask

- `BASIC` tier `acceptCeiling`: a prior session's notes claim `0.20` is
  "confirmed ground truth," but every live deploy this session and the
  original dashboard/landing page code use `0.30` consistently, without
  correction. **Do not silently pick one.** Surface this explicitly to
  Alex before touching `TIER_CONFIG` in either direction.

---

## 2. Before writing any migration

1. **Check the actual schema first.** Column names have been wrong in
   assumptions multiple times this project (`sku_catalog.name` doesn't
   exist; `users` uses `merchant_code` not `merchant_id` in some places
   and `phone` as the natural key in others). One `information_schema`
   query costs less than a failed migration.
2. **Use `apply_migration`, not `execute_sql`, for schema changes** — it
   creates a versioned record. Reserve `execute_sql` for read-only
   diagnostics.
3. **Wrap policy/function drops in `DO $$ ... EXCEPTION WHEN OTHERS THEN
   NULL; END $$`** when re-running is plausible — silent failures happen
   otherwise, especially with `DROP POLICY IF EXISTS` ordering.
4. **`FOR INSERT` / `FOR UPDATE` / `FOR DELETE` must be separate
   `CREATE POLICY` statements.** Combining with commas is a syntax error.
5. **Views must be dropped before altering columns they depend on**, then
   recreated.
6. Append `NOTIFY pgrst, 'reload schema';` to migrations that add columns
   or tables.

---

## 3. RLS pattern (the house style)

Every non-public table follows this shape:

```sql
CREATE POLICY <table>_owner ON public.<table>
  FOR SELECT USING (
    <owner_column> = (SELECT <field> FROM public.users WHERE id::text = (SELECT auth.uid())::text)
    OR EXISTS (SELECT 1 FROM public.users WHERE id::text = (SELECT auth.uid())::text AND is_admin = true)
  );
```

Always wrap `auth.uid()` in `(SELECT auth.uid())` — this is the RLS
init-plan optimization (evaluated once per statement, not once per row).
Skipping this was the single largest performance finding in the initial
audit, across 38 policies.

**Never create a second permissive policy that overlaps an existing one
for the same command.** Postgres evaluates ALL matching permissive
policies and ORs them — two SELECT policies on one table means double
the work per query, and if one of them is looser than intended (e.g. a
leftover `qual: true`), it silently wins. This has happened twice this
session (`merchant_whitelist`, `merchant_margins` had a public-read policy
quietly overriding a properly-scoped one). When adding a policy, check
`pg_policies` for the table first.

---

## 4. Function security checklist

Every `SECURITY DEFINER` function must:

1. `SET search_path = public` (or `public, extensions` if it calls
   `pgcrypto`/`pg_trgm` functions)
2. `REVOKE EXECUTE ... FROM PUBLIC`
3. **Also explicitly `REVOKE EXECUTE ... FROM anon, authenticated`** —
   `REVOKE FROM PUBLIC` alone is not sufficient if a direct grant to those
   roles exists independently (this happened to `hash_password`,
   `verify_password`, `match_sku_trgm`, and every trigger function this
   session, apparently from a blanket `GRANT EXECUTE ON ALL FUNCTIONS IN
   SCHEMA public` run at some point in the project's history).
4. `GRANT EXECUTE ... TO service_role` explicitly.
5. **Verify, don't trust.** After any grant/revoke migration, run:
   ```sql
   SELECT grantee, privilege_type FROM information_schema.routine_privileges
   WHERE routine_schema = 'public' AND routine_name = '<fn>';
   ```
   `has_function_privilege('anon', ...)` is a fine spot-check but
   `information_schema.routine_privileges` is the ground truth — it shows
   *why* a grant exists, not just whether one currently resolves true.

---

## 5. Edge function deployment

- `nx-ussd` is ~96KB — **routinely exceeds MCP tool size limits.** If a
  deploy fails for size reasons, this is expected; the fallback is CLI:
  `supabase functions deploy nx-ussd --project-ref balrpczytusvzzquzqob`.
- `import_map_path` bug: if a deploy fails with `import map path does not
  exist - .../file:///tmp/.../deno.json` (a doubled/stale absolute path),
  retry the exact same call once — this is a transient MCP artifact, not
  a real problem with your `deno.json`.
- Multi-file deploys (anything with `handlers/*.ts`) must pass **every**
  file in the `files` array each time, even unchanged ones — the deploy
  replaces the whole function, it doesn't patch individual files.
- After deploying, the version number may jump by more than 1 from what
  you expect. This has been observed to correlate with platform-level
  redeploys/restores happening independently of your own deploy calls —
  don't treat a surprising version number alone as evidence your deploy
  failed; check the actual `updated_at` and test behavior instead.

---

## 6. Auth architecture — do not blur these three systems

1. **Admins** — Supabase Auth (email/password) → real JWT → `auth.uid()`
   resolves → RLS checks `users.is_admin`. Frontend uses the **anon key
   only**. Never introduce a `supabaseAdmin` client or any
   `VITE_`-prefixed service-role variable in `src/` — this was found live
   in the codebase once already (unused, but architected to leak the
   master key the moment that env var was ever set). If the admin
   dashboard needs a privileged action, it calls an edge function; it
   never holds `service_role` itself.
2. **Merchants/customers** — USSD-native. PIN hashed via
   `hash_password()`/`verify_password()` (bcrypt via pgcrypto). No
   Supabase Auth identity exists for these users at all — `auth.uid()`
   will never resolve for them. Do not design any USSD-facing feature
   that assumes a Supabase session exists.
3. **Partners** (FMCG/wholesaler/logistics) — SHA-256 hashed API keys in
   `api_keys`, `scope` jsonb array checked per-endpoint in `fmcg-api`.
   Never conflate this with Supabase Auth either.

Phone-based OTP (`admin_otp_sessions` table) was originally built for
admin login and correctly rejected as insecure for that purpose (SMS
interception risk with no real session backing it). It's now repurposed
for merchant/customer PIN-reset only, where the OTP itself IS the identity
proof, not a supplement to a weaker one. Don't resurrect it for admin use.

---

## 7. Before declaring anything "fixed" or "in sync"

Run the actual check, not the memory of having run it before:

- Row counts / table existence: `Supabase:list_tables` or targeted
  `information_schema` query
- Function grants: `information_schema.routine_privileges`, not just
  `has_function_privilege`
- RLS enabled: `pg_class.relrowsecurity`
- Edge function version: `Supabase:list_edge_functions`, check
  `updated_at`, and — where it matters — grep the actual deployed source
  via `Supabase:get_edge_function` for a known code marker rather than
  trusting the version number alone.
- Advisor output (`get_advisors`, both `security` and `performance`) after
  any batch of fixes, not just before.

This project has now twice shown that "I fixed this earlier this session"
is not a safe assumption to carry forward without re-verification —
external events (project restore, uploaded repo exports, redeploys) can
silently reintroduce old state.

---

## 8. Style / communication conventions (from the human side)

- Terse, directive, "Grug mode" — action first, explanation only if
  asked "why?"
- Diagnostic reads before destructive writes, batched into as few
  `apply_migration` calls as reasonably possible
- When something is ambiguous, state the assumption and proceed — don't
  stall on a clarifying question unless genuinely blocked
- Token efficiency matters to this user specifically — batch, don't
  narrate excessively, don't re-explain things already established in
  this same file
