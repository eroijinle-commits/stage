# Debug Mode Rules (Non-Obvious Only)

- Client-side DB errors from `src/lib/db/client.ts` are misleading — it always throws "Direct database access no longer supported". The real DB error is in the server logs (`pnpm server` output).
- Rate limiter (`src/lib/stake-api/rate-limiter.ts`) silently queues requests when at max concurrency (5). Stuck promises = check `activeCount` and `queue.length`.
- 429 errors trigger exponential backoff (1s base, 30s max). The `Retry-After` header from Stake is respected if present.
- Token auth failures (401) produce `StakeApiError` with type `"invalidSession"` — the user-facing message says to re-enter API token in Settings.
- `slipHydrated` promise in `src/store/useSlipStore.ts` resolves after localStorage rehydration — if components render before this, they see empty state.
- Server proxies Stake GraphQL at `/api/graphql` — check both the proxy response AND upstream response separately when debugging.
- `TOKEN_ENCRYPTION_KEY` must be exactly 64 hex characters (32 bytes). Missing/wrong key causes cryptic "Missing TOKEN_ENCRYPTION_KEY env var" at runtime.
- Test setup (`tests/setup.ts`) mocks `localStorage` and `fetch` globally — tests that need real values must override these mocks per-test.
