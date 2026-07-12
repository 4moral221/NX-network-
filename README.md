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

## 5. Monetization & Ads Strategy (Secondary Revenue Line)

To keep the platform's user experience clean and prioritize core utility, advertising and sponsored placements are designed as a carefully controlled secondary revenue line.

### PWA Ads Principles
- **Placement**: All ads are displayed below the primary action (e.g., below "Place Order" or "View Basket"), never blocking checkout flow or critical actions. Full-screen interstitials are strictly prohibited.
- **Relevance**: Prioritize FMCG and merchant-relevant promos (e.g., maize flour promos, bulk package discounts, new SKU releases) matched to real purchase behavior.
- **Transparency**: Every advertisement is clearly labeled as "Sponsored" or "Promo from [Brand]". A client setting is provided ("Fewer ads — but you may miss some offers") to let users adjust ad density.

### USSD Ads Principles
- **Conciseness**: Ads are restricted to a maximum of one line of text (e.g., `Promo: Buy 5kg Pembe this week, earn extra NX.`).
- **Timing**: Ads are only rendered on receipt/confirmation screens after the core transaction is complete, or as optional selection menus (e.g., `1. Complete, 2. View current brand offers`). They are never injected in-between transactional steps.
- **Integrity**: Promo text is kept lightweight to avoid breaking USSD page length limits.

### Business Model & Retail Media Integration
- **Retail Media / Activation**: Brands pay to place targeted offers inside both restock and customer demand flows.
- **Performance-Based Pricing**: Pricing models support cost-per-impression (CPM), cost-per-click (CPC) inside the PWA, and cost-per-redemption for sponsored loyalty boosts.
- **Ecosystem Integration**: Promos tie directly back to our FMCG data & loyalty pool system, allowing partners to sponsor specific merchant restock incentives.
