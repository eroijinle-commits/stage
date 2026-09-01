# Architect Mode Rules (Non-Obvious Only)

- **Server-only DB access**: The client DB module (`src/lib/db/client.ts`) is intentionally dead code. All DB operations go through Express REST (`server/index.ts`). This is a security boundary, not a bug.
- **Contract-first typing**: All types live in `src/lib/contracts/` — API, DB, state, and UI layers each have their own contract file. New features must define types there first.
- **Rate limiter is global state**: `src/lib/stake-api/rate-limiter.ts` uses module-level `activeCount` and `queue[]`. Tests must call `resetRateLimiter()` to avoid cross-test contamination.
- **Token encryption boundary**: API tokens cross the trust boundary as plaintext in localStorage (client) → encrypted at rest in PostgreSQL (server). The `TOKEN_ENCRYPTION_KEY` must never be exposed to the client bundle.
- **Slip hydration race**: Zustand `persist` middleware rehydrates async. The `slipHydrated` promise is the only safe way to gate dependent components.
- **Express SPA fallback**: `server/index.ts` has an SPA fallback middleware that serves `index.html` for all non-API GET requests in production.
- **Rate limit**: Stake API max 5 concurrent requests. Every API call in `src/lib/stake-api/` goes through the rate limiter — never call `fetch` directly on Stake endpoints.
- **`modulePreload: { polyfill: false }`** in `vite.config.ts` is intentional for same-origin CORS compatibility on Render.
