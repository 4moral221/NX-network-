# NX Network Project Specifications

NX is a USSD-native loyalty and supply chain network that helps Kenyan informal retailers (dukas) earn more, restock smarter, and give customers instant savings — on any phone.

---

## 1. Core North Star

**LOYALTY FOR EVERY DUKA.**
> A USSD loyalty and supply chain network that helps dukas earn more, restock smarter, and give customers instant savings — on any phone.

---

## 2. Platform Architecture & Core Features

- **USSD Interface (`*384*6180#`)**: Lightweight, offline-ready transaction portal that works on any basic analog or smart device with zero data overhead.
- **Vite & React Landing Page**: Desktop-first and mobile-responsive marketing landing page showing real-time USSD interactive simulations, profitability tools, and merchant/FMCG portal gateways.
- **Enterprise Portals (FMCG, Partners, Hub)**: High-fidelity dashboards mapping last-mile SKU velocities, spatial distribution statistics, and merchant pool utilization metrics.

---

## 3. Business Model & Loyalty Pool Solvency

### Franchise Tiers Hierarchy
- **BASIC**: 60% Pool Rate, 20% Acceptance Ceiling.
- **CERTIFIED**: 65% Pool Rate, 30% Acceptance Ceiling.
- **HUB**: 70% Pool Rate, 40% Acceptance Ceiling.

### Dynamic Solvency Controls (Safety Rails)
Rates and multipliers adjust dynamically based on loyalty pool utilization (Pool Health) to prevent over-leverage or unbacked rewards:
- **Customer Earn Multiplier**:
  - Below 40% utilization: **1.0x**
  - 40% - 70% utilization: **0.5x**
  - 70% - 90% utilization: **0.25x**
  - Over 90% utilization: **0x** (temporary freeze)
- **Merchant Acceptance Rate**:
  - Automatically scaled down from 20% / 30% / 40% limits as pool health declines to protect the merchant's working capital.

---

## 4. Platform Advertising & Monetization Strategy

To preserve exceptional user experiences, advertisement and sponsored media placements act as a secondary, carefully regulated revenue driver.

### PWA Ad Principles
1. **Strategic Placement**: Banners and promotional cards are positioned exclusively below the fold and below primary interaction boundaries (e.g., following "Place Order"). Full-screen interstitial takeovers are disallowed.
2. **Contextual Relevance**: Ad inventory is focused strictly on FMCG products, warehouse bulk specials, and merchant restocking incentives mapped to localized inventory velocities.
3. **Control & Transparency**: All promos are labeled explicitly as "Sponsored" or "Brand Promos". Users can opt to request fewer ads via system settings.

### USSD Ad Principles
1. **Character Boundaries**: Ads are limited to a single line of character text (max 60 characters) to prevent page overflows.
2. **Context-Driven Placement**: Ads are only served on successful final confirmation or receipt screens, never during active transactional pathways.
3. **Option Selection**: Provides optional, low-friction entry steps (e.g., `1. Confirm Order, 2. View current brand offers`).

### Monetization Channels
- **Bulk Wholesale Spread**: NX sources direct from major FMCG manufacturers at deep trade prices and supplies merchants at highly competitive markups.
- **Retail Media Campaigns**: FMCG brands pay subscription and placement fees to highlight specific products or sponsor localized loyalty boosts.
- **Micro-transaction Fees**: A minor flat service fee of 2 NX applies only when completing successful customer redemptions with a positive balance.
