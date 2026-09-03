# StakeBet Batch — UI Foundation Plan

## Context

The user has provided `src/imports/segment-1-ui-prompt.md`, a detailed spec for the UI foundation and design system of a sports betting batch-management app called **StakeBet Batch**. The spec was written for a Next.js project, but the environment is a **Vite + React 19 + Tailwind CSS v4** project — that architecture must be honored. The app is currently empty (`App.tsx` renders a blank div). This plan covers adapting and implementing Segment 1 in full.

---

## Aesthetic Stance

**Data-dense terminal** — Bloomberg Terminal meets a modern dark sports data product.

- **Display/Mono:** JetBrains Mono (headings, numbers, odds, labels)
- **Body:** Inter (readable text, descriptions)
- Dark ground (`#0a0d0f`), near-black card surfaces (`#111418`), hairline borders (`#1e2530`), brand green (`#10b981`) for odds/profit, status reds/yellows per the contract tokens.

Font wiring: Google Fonts `@import` in `src/index.css` (Vite convention).

---

## Architecture Adaptation (Next.js → Vite)

| Spec says (Next.js)            | Adapt to (Vite/React)                                                            |
| ------------------------------ | -------------------------------------------------------------------------------- |
| `app/layout.tsx` shell         | `src/App.tsx` as AppShell                                                        |
| `@/*` path alias               | `@/*` already wired in `vite.config.ts` as `src/*`                               |
| `tailwind.config.ts`           | Tailwind v4 tokens in `src/index.css` via `@theme`                               |
| `pages/` or `app/` routing     | Single-SPA tabs or React Router (no router needed for v1 — tab-based navigation) |
| Radix, Recharts, Zustand, etc. | Install the same packages                                                        |

---

## File Structure

```
src/
  index.css              — Google Font imports + Tailwind v4 @theme tokens
  App.tsx                — AppShell (TopBar + SideNav + main content area)
  lib/
    contracts/           — Copy 4 contract files verbatim from spec
      api.contract.ts
      db.contract.ts
      ui.contract.ts
      state.contract.ts
    utils/
      cn.ts              — clsx + twMerge
  hooks/
    useMockData.ts       — Mock fixture/market/bet history generators
    useDiscovery.ts      — Mock discovery hook
    useBetSlip.ts        — Zustand slice for slip state
    useSettings.ts       — Zustand slice for settings
  components/
    ui/
      Button.tsx
      Input.tsx
      NumberInput.tsx
      Select.tsx
      MultiSelect.tsx
      Badge.tsx
      Card.tsx
      OddsButton.tsx     — CRITICAL: trend animation, selected/suspended states
      DataTable.tsx
      Modal.tsx
      Drawer.tsx
      Toast.tsx          — Sonner integration
      Skeleton.tsx
      StatCard.tsx
      Sparkline.tsx
      index.ts           — barrel export
    layout/
      TopBar.tsx
      SideNav.tsx
      BetSlipDrawer.tsx
      CommandPalette.tsx
    discovery/
      SearchFilterBar.tsx
      FixtureRow.tsx
      ResultsTable.tsx
      MarketBrowser.tsx
    slip/
      SlipItem.tsx
      ModeToggle.tsx
      StakeInput.tsx
      PlaceButton.tsx
    history/
      BetHistoryTable.tsx
      BetDetailModal.tsx
    analytics/
      KPIOverview.tsx
      ProfitLossChart.tsx
    settings/
      ApiTokenInput.tsx
      PresetsManager.tsx
  pages/
    DiscoveryPage.tsx
    HistoryPage.tsx
    AnalyticsPage.tsx
    SettingsPage.tsx
```

---

## Dependencies to Install

```
pnpm add zustand @tanstack/react-query react-hook-form @hookform/resolvers zod
pnpm add recharts lucide-react clsx tailwind-merge date-fns framer-motion sonner
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
pnpm add @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-popover
pnpm add @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-accordion
```

---

## Implementation Order

1. **`src/index.css`** — Google Font imports (JetBrains Mono, Inter) + Tailwind v4 `@theme` tokens (colors, radius, animations)
2. **Contract files** — copy from spec verbatim into `src/lib/contracts/`
3. **`src/lib/utils/cn.ts`** — utility function
4. **Core UI components** — Button → Badge → Skeleton → Card → Input → Select → OddsButton → DataTable → Modal/Drawer → StatCard → Sparkline → Toast
5. **Mock data + hooks** — `useMockData`, `useDiscovery`, `useBetSlip` (Zustand), `useSettings` (Zustand)
6. **Layout** — AppShell in `App.tsx`, TopBar, SideNav (collapsible), BetSlipDrawer
7. **Page components** — DiscoveryPage (fixture table + market browser), HistoryPage, AnalyticsPage, SettingsPage
8. **Wire up navigation** — tab state in AppShell to switch pages

---

## Key Design Decisions

- **No React Router** for v1 — tab-based page switching via local state in AppShell keeps things simple and avoids routing complexity in Vite SPA.
- **Tailwind v4 tokens** — defined in `src/index.css` under `@theme { }` block, not a separate config file. Maps to brand green, status colors, and dark surfaces.
- **200-line limit per file** honored — larger components (DataTable, BetHistoryTable) split into subcomponents.
- **OddsButton** gets framer-motion flash animation on odds change (green flash up, red flash down).
- **Zustand** for slip and settings state (replaces the reducer pattern from the spec — simpler in SPA context).
- **All mock data** uses realistic names, scores, and NGN amounts.

---

## Verification

1. Dev server hot-reloads without errors
2. Fixture discovery page shows tabular fixture list with odds buttons
3. Clicking an odds button adds to bet slip drawer (slides in from right)
4. History page shows DataTable with mock bet records, sortable columns
5. Analytics page shows KPI stat cards and a Recharts profit/loss chart
6. Settings page renders API token input and preset manager
7. TopBar and SideNav collapse/expand correctly
8. No TypeScript errors on the contract types
