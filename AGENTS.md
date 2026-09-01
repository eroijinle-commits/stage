# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview

React + Vite + Tailwind CSS v4 sports betting app integrating Stake.com's GraphQL API. Express 5 server proxies Stake API and handles DB operations via Drizzle ORM (PostgreSQL/Neon).

## Commands

- `pnpm dev` — Vite dev server (port 5173, proxies `/api/graphql` → `localhost:3001`)
- `pnpm server` — Express backend (port 3001)
- `pnpm dev:all` — Both frontend + backend concurrently
- `pnpm build` — Production build
- `pnpm test` — Vitest run
- `pnpm test:watch` — Vitest watch mode
- `pnpm test:coverage` — Coverage (covers `src/lib/**` + `src/hooks/**`, excludes `db/client.ts` + `db/seed.ts`)
- `pnpm format` — oxfmt formatter
- `pnpm db:generate` / `pnpm db:migrate` / `pnpm db:studio` — Drizzle Kit
- `pnpm db:seed` — Seed database

## Critical Architecture

- **DB access is server-only**: `src/lib/db/client.ts` is deprecated and throws. All DB operations go through Express REST endpoints (`src/lib/api.ts` → `server/index.ts`).
- **Dual deployment**: Render (full-stack, `pnpm start`) and Vercel (frontend-only). `render.yaml` has full config.
- **Token encryption**: Server encrypts API tokens with AES-256-GCM (`server/crypto.ts`). Requires `TOKEN_ENCRYPTION_KEY` env var (64 hex chars).
- **Slip hydration**: `useSlipStore` rehydrates from localStorage asynchronously. Components must await `slipHydrated` promise (exported from `src/store/useSlipStore.ts`) before assuming state is populated — otherwise you get flash-of-empty-state bugs.
- **`addSelection` toggles**: Calling `addSelection()` with an existing ID removes it (toggle behavior), not a no-op.
- **Bet placement enum**: Stake API only accepts `"sports"` for `betType` enum — internal `"multi"` mode still sends `"sports"` upstream.

## Non-Obvious Patterns

- **`@/` alias** maps to `src/` (configured in both `vite.config.ts` and `vitest.config.ts`).
- **No Tailwind config file**: Tailwind CSS v4 uses `@tailwindcss/vite` plugin — customization goes in `src/index.css` via `@import 'tailwindcss'`.
- **Contract types**: `src/lib/contracts/` defines API, DB, state, and UI interfaces — check these before adding new types.
- **Rate limiter**: `src/lib/stake-api/rate-limiter.ts` enforces max 5 concurrent requests with exponential backoff. All Stake API calls must go through `executeQuery()` which wraps this.
- **`cn()` utility**: `src/lib/utils/cn.ts` — use this for conditional Tailwind classes (combines `clsx` + `tailwind-merge`).
- **Slip sharing**: `shareSlip()` returns a base64 code for Stake AND a `?slip=` URL param for Stage restore. `restoreSlip()` in `App.tsx` reads this on load.
- **`modulePreload: { polyfill: false }`**: Intentional in `vite.config.ts` to avoid CORS issues on same-origin deployments.
- **Unescaped apostrophes in single-quoted strings break the build** — use double quotes or escape them.

## Env Vars

- `DATABASE_URL` — PostgreSQL connection (Neon)
- `TOKEN_ENCRYPTION_KEY` — 64 hex char key for AES-256-GCM
- `CORS_ORIGIN` — Comma-separated allowed origins
- `VITE_API_URL` — Optional frontend API base (defaults to same origin)
