# NX Network - Technical & Business Context

## Core Philosophy
NX is a "Live Demand" aggregation network for informal retail in Kenya. It bypasses traditional distributors by connecting FMCG brands directly to shops (merchants) via real-time demand.

## Technical Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Motion (framer-motion) for animations.
- **Backend/Database**: Supabase (PostgreSQL + Auth + Edge Functions).
- **USSD Interface**: The primary UI for merchants and customers is `*384*6180#`.
- **Backend Models / AI**: Always use **GLM 5.2** via **Nvidia NIM API Key** (`NVIDIA_NIM_API_KEY`) for backend tasks.

## Business Logic Rules (Context Training)

### 1. Franchise Tiers
- **BASIC**: 60% Pool Rate, 20% Acceptance Ceiling.
- **CERTIFIED**: 65% Pool Rate, 30% Acceptance Ceiling.
- **HUB**: 70% Pool Rate, 40% Acceptance Ceiling (Warehousing tier).

### 2. Liquidity Pool Mechanics
The "Pool" is the total NX value a merchant can redeem in a cycle (month).
- **Pool = (Gross Margin * Pool Rate) + FMCG Boosts**.
- **FMCG Boosts**: Explicit contributions from brands to push specific products.
- **Utilization**: `1 - (Remaining Pool / Total Pool)`.

### 3. Dynamic Network Throttling (Safety Rails)
Rates adjust automatically based on Pool Health (Utilization):
- **Earn Multiplier (Customer Reward Rate)**:
  - < 40% Util: 1.0x
  - 40% - 70% Util: 0.5x
  - 70% - 90% Util: 0.25x
  - \> 90% Util: 0x (Rewards disabled to prevent over-leverage)
- **Merchant Acceptance Rate (NX per Txn)**:
  - Throttled at various steps (20%, 10%, 0%) as pool utilization crosses 40%, 70%, 90%.

### 4. Audit & Integrity
- **Audit View**: `audit_balance_drift` monitors discrepancy between cached `users.nx_balance` and the append-only `ledger_entries`.
- **Status Hardening**: Transactions must pass through strict status transitions (pending -> confirmed/rejected).

### 5. Transparency & Restock Experience
- **Simple UI**: Use a single card in USSD/dashboard after checkouts.
- **Absolute Numbers**: Display absolute amounts (e.g., "KES 75") rather than percentages.
- **Call-out Boosts**: Explicitly label brand-contributed boosts (e.g., "From Unilever Boost").

## Browser Compatibility Guidelines
- Ensure "touch-action: pan-y" or similar is used for scrolling elements in modals/drawers.
- Use `backdrop-blur-*` sparingly if targeting older mobile browsers.
- Always include `id` attributes on interactive elements for tracking and styling.
- Prevent parent scrolling when modals are open using `useEffect`.
