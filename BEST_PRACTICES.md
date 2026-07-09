# NX Network - Developer Best Practices & Architectural Guidelines

This document details the core architectural standards, development workflows, and frontend/backend integration patterns implemented across the NX Network codebase. Adherence to these best practices prevents common runtime bugs, styling issues, and browser compatibility pitfalls.

---

## 🚀 1. Supabase Client Management (Critical)

To prevent browser warnings, memory overhead, and security/state synchronization leaks:
* **Avoid Redundant Initialization**: Never call `createClient` repeatedly inside React components or helper functions. Always import the shared instance from `@/src/lib/supabase` or `@/src/services/ussd/db`.
* **Use Cached Multi-Client Providers**:
  Our shared `@/src/lib/supabase` module employs client instance caching. When creating dynamic clients for service-role or custom-authenticated scopes, reuse existing clients via a clean URI/key cache key.
* **Service-Role Client Isolation**:
  Always disable browser session persistence on clients initialized with high-privilege keys (e.g., `supabaseAdmin`) to block security leakage to user contexts:
  ```typescript
  const client = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  ```
* **Graceful Mock Fallbacks**:
  When environment variables are missing (such as in serverless/offline staging containers), ensure all DB utilities fall back cleanly to synthetic mock handlers to prevent the app from crashing on boot or rendering blank screens.

---

## 🛠️ 2. Module Resolution & Vite Configuration

Vite serves `.tsx` files inside modern ES modules dynamically during development:
* **Import Extensions**: Do **NOT** append `.tsx` extensions to file paths in your export/import statements (e.g., do not write `import { ErrorBoundary } from './ErrorBoundary.tsx'`). Vite resolves extensions dynamically. Including explicit `.tsx` extensions in modern TypeScript files can break module maps during production compilation.
* **Relative vs Absolute Paths**: Prefer standard relative paths (`../components/*`) or standard aliases configured in `tsconfig.json` (`@/*`) consistently.

---

## 🔒 3. Safe Secret Handling & Full-Stack Proxies

* **Server-Only Secrets**: Keep highly sensitive API credentials (e.g., `GEMINI_API_KEY`, `VERCEL_TOKEN`, Supabase service role keys) out of client-side bundles. Never prefix these with `VITE_`.
* **Proxy-First Pattern**: Implement backend handlers inside `server.ts` routes starting with `/api/*` to proxy client-side requests requiring secret headers.
* **Lazy Initialization**: Initialize integration clients sequentially only when a request triggers them, avoiding crash-on-startup loops when key variables are temporarily unprovided in development environments.

---

## 📱 4. Mobile & Browser Compatibility

Because our primary duka-level users leverage responsive mobile devices:
* **Touch Optimization**: Elements with overflow scroll in modals and drawers must be decorated with CSS properties like `touch-action: pan-y` to ensure fluid interaction.
* **Modal Overlay Scroll Suppression**: Always implement a React hook or `useEffect` that updates `document.body.style.overflow = "hidden"` while modals/interactive sheets are open, cleaning up properly on unmount.
* **Reliable Viewport Calculations**: Avoid writing hardcoded dimensions (e.g., `window.innerWidth - 120`). Use CSS utility bounds (`w-full`, responsive container max-widths, flex boxes) or mount a `ResizeObserver` on parent containers to auto-adjust dynamic canvas layouts.

---

## 🧪 5. Testing & Verification Workflows

* **Run Suite Locally**: Ensure all edits are fully verified by running:
  ```bash
  npx vitest run
  ```
* **Verify Lint & Compile**:
  Always ensure TypeScript emits zero compilation errors and matches strict standards by checking:
  ```bash
  npm run lint
  # and
  npm run build
  ```
