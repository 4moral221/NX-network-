# NX Network

NX is a "Live Demand" aggregation network for informal retail in Kenya. It bypasses traditional distributors by connecting FMCG brands directly to shops (merchants) via real-time demand.

## Technical Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Motion (framer-motion) for animations.
- **Backend/Database**: Supabase (PostgreSQL + Auth + Edge Functions).
- **USSD Interface**: The primary UI for merchants and customers is `*384*6180#`.

## Business Logic Rules

### 1. Franchise Tiers
- **BASIC**: 60% Pool Rate, 20% Acceptance Ceiling.
- **CERTIFIED**: 65% Pool Rate, 30% Acceptance Ceiling.
- **HUB**: 70% Pool Rate, 40% Acceptance Ceiling (Warehousing tier).

### 2. Liquidity Pool Mechanics
The "Pool" is the total NX value a merchant can redeem in a cycle (month).
- **Pool = (Gross Margin * Pool Rate) + FMCG Boosts**.
- **FMCG Boosts**: Explicit contributions from brands to push specific products.

### 3. Dynamic Network Throttling (Safety Rails)
Rates adjust automatically based on Pool Health (Utilization):
- **Earn Multiplier (Customer Reward Rate)**:
  - < 40% Util: 1.0x
  - 40% - 70% Util: 0.5x
  - 70% - 90% Util: 0.25x
  - \> 90% Util: 0x (Rewards disabled to prevent over-leverage)
- **Merchant Acceptance Rate (NX per Txn)**:
  - Throttled at various steps (20%, 10%, 0%) as pool utilization crosses 40%, 70%, 90%.

### 4. Setup & Deployment
1. Ensure `.env` is populated with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. Run `npm install`
3. Run `npm run dev`
