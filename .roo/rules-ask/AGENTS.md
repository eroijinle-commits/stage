# Ask Mode Rules (Non-Obvious Only)

- "src/imports/" and "Prompt files/" contain design spec docs (segment prompts, architecture docs) — these are the source of truth for feature requirements, not generated code comments.
- `src/lib/contracts/` has 4 contract files: `api.contract.ts` (Stake API types), `db.contract.ts` (DB record types), `state.contract.ts` (Zustand state shapes), `ui.contract.ts` (component prop types + bet type system).
- `scraped/` directory contains raw Stake.com page scrapes used for API schema discovery — not runtime data.
- `scripts/` has probe/introspection scripts (Python + Node) for discovering Stake GraphQL schema — run manually, not part of the app.
- The project has NO React Router — page switching is manual state in `App.tsx` with a `Page` union type.
- Tailwind CSS v4 has no config file — all customization is in `src/index.css` via `@import 'tailwindcss'` and `@theme` blocks.
- Dual deployment: Render serves full-stack (Express + built frontend), Vercel serves frontend only with SPA rewrites.
