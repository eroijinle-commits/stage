# Code Mode Rules (Non-Obvious Only)

- `src/lib/db/client.ts` is DEPRECATED — never import from it. Use `src/lib/api.ts` for client-side data access (calls Express server endpoints).
- All Stake API calls must go through `executeQuery()` in `src/lib/stake-api/client.ts` — it handles rate limiting, retries, and auth headers.
- Contract types in `src/lib/contracts/` are the canonical type definitions. Define new types there, not inline.
- `useSlipStore` has a `slipHydrated` promise — components that depend on persisted slip state must gate on it to avoid hydration mismatches.
- `addSelection()` in the slip store TOGGLES — it removes if already present, not a no-op.
- The `betType` field in the Stake API mutation only accepts `"sports"` — internal `"multi"` mode maps to `"sports"` before sending.
- Zustand stores are in `src/store/`, hooks in `src/hooks/`. Hooks wrap stores with React Query or side effects.
- DB repositories (`src/lib/db/repositories/`) are server-side only — they're called by Express routes in `server/index.ts`, not by frontend code.
- Use `cn()` from `src/lib/utils/cn.ts` for all conditional Tailwind class merging.
- Double quotes required for strings with apostrophes — unescaped `'` in single-quoted strings breaks oxfmt/build.
- Express server runs on port 3001; Vite proxies `/api/*` to it during dev.
