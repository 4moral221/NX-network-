# NX Network Technical Architecture

## The Vision
NX Network functions as a "Live Demand" aggregation ecosystem connecting FMCG (Fast-Moving Consumer Goods) brands to Dukas (informal shops) across Kenya via USSD (*384*6180#) and progressive web/admin portals.

## Core Pillars
1. **Duka-Centric Design:** Built first for merchants using standard feature phones, relying heavily on simple USSD flows for inventory and checkouts.  
2. **Dynamic Reward Throttling:** The "Brain" of NX. Calculates real-time pool utilization per merchant and applies brakes (Earn Multiplier Drop) down to 0% to avoid draining a Duka’s liquidity pool unexpectedly.
3. **Smart Fulfillment:** When merchants run out of NX-purchased goods (or the physical inventory), FMCG partners are batched lists to push fulfillment instantly.

## The App Infrastructure
- **Frontend Stack**: Vite + React 18, Tailwind, Lucide React, and Framer Motion. 
- **Portals**:
    - **Partner Portal**: For FMCG brand managers managing SKUs and observing real-time brand velocity.
    - **Control Center (Admin)**: The central dashboard for operators to approve merchants, monitor health, and manually heal database ledger drifts.
    - **Merchant/Customer PWA**: Mobile-first progressive web apps as alternatives to USSD.
    - **Live Map**: A map built using Leaflet mimicking real-time order generation.
- **Backend Stack**: Node.js, Express (`server.ts`). Serves as a simulated USSD provider and handles REST endpoints for Admin/Merchant applications.
- **Deployments**: Vercel Serverless Functions. Since it's serverless, we must correctly manage memory state and connection pooling. 

## Database Schema (Supabase)
At its core, a PostgreSQL representation:
- `users`: Includes roles (`merchant`, `customer`, `admin`), `nx_balance`, `franchise_tier`.
- `transactions`: The master ledger for all activities (`status` = `pending_customer`, `awaiting_merchant`, `completed`).
- `fmcg_partners`: Represents brands with `dashboard_password` / tokens. 

## Vercel Deployment Workarounds
Vercel Edge/Serverless functions require strict environment setups:
- To bridge local `process.env.VITE_SUPABASE_URL` variables to the Vercel Lambda APIs, we pass built-in flags: `--env SUPABASE_URL=...` during deployments. 
- A graceful failure mechanism (Proxy) is baked into `server.ts` to ensure that API endpoints safely throw `500 Internal Server Errors` rather than completely exiting the serverless process.
