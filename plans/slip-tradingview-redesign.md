# SlipPage TradingView Terminal Redesign

## Design Read
Dense betting terminal for power users, with a TradingView-inspired dark cockpit language, leaning toward monospace-heavy utilities + tight grid + color-coded data rows.

## Dials
| Dial | Value | Rationale |
|------|-------|-----------|
| DESIGN_VARIANCE | 3 | Systematic precision, symmetric grid, zero floating elements |
| MOTION_INTENSITY | 4 | Functional transitions only: panel collapse, row highlight, tab switch |
| VISUAL_DENSITY | 9 | Cockpit: tight paddings, no card boxes, 1px lines separate data, monospace numbers |

## Architecture

### Current State
- [`SlipPage.tsx`](Git Files/src/components/slip/SlipPage.tsx) - Container with 3 tabs (Manual, Compute, Saved)
- [`SlipTabs.tsx`](Git Files/src/components/slip/SlipTabs.tsx) - Simple tab bar
- [`SlipVariantA.tsx`](Git Files/src/components/slip/SlipVariantA.tsx) - Manual tab: left table + right summary rail (360 lines)
- [`SlipItem.tsx`](Git Files/src/components/slip/SlipItem.tsx) - Individual selection card (40 lines)
- [`BetSlipDrawer.tsx`](Git Files/src/components/layout/BetSlipDrawer.tsx) - Global overlay drawer (592 lines)

### Target Layout (TradingView Terminal)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Manual] [Compute] [Saved]  │  3 Selections  │  Toolbar:       │
│  tab bar (chart-style)      │  badge         │  Mode | Bulk |  │
├─────────────────────────────┴────────────────┼─── Actions ──────┤
│                                              │                  │
│  SELECTION TABLE (main canvas)               │  ORDER PANEL    │
│  ┌────┬──────────┬────────┬──────┬───────┐  │  (collapsible)  │
│  │ #  │ Fixture  │ Market │ Odds │ Stake │  │                  │
│  ├────┼──────────┼────────┼──────┼───────┤  │  Mode: Singles   │
│  │ 1  │ Team A v │ Over  │ 1.85 │ 1000  │  │  Selections: 3   │
│  │    │ Team B   │ 2.5   │      │       │  │  ──────────────  │
│  ├────┼──────────┼────────┼──────┼───────┤  │  Stake: [____]  │
│  │ 2  │ ...      │ ...   │ 2.10 │ 1000  │  │  Return: 5,750   │
│  ├────┼──────────┼────────┼──────┼───────┤  │  Profit: +2,750  │
│  │ 3  │ ...      │ ...   │ 1.55 │ 1000  │  │  ──────────────  │
│  └────┴──────────┴────────┴──────┴───────┘  │  [Place Bets]    │
│                                              │                  │
├──────────────────────────────────────────────┴──────────────────┤
│  Bottom Bar: 3 bets │ Total: 3,000 │ Return: 5,750 │ [PLACE]  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **No card containers on data rows** - Rows separated by 1px `border-b border-border/50`. Cards are banned at density 9.
2. **Monospace everywhere** - All numbers, labels, and data use `font-mono`. The existing JetBrains Mono stays.
3. **Color-coded odds** - Green for odds > 2.0, red for odds < 1.5, neutral for mid-range. Matches existing `--color-odds-up/down/stable` tokens.
4. **Collapsible right panel** - Toggle button in toolbar ribbon. Panel slides in/out with `transition-all duration-200`. Default: open.
5. **Fixed bottom action bar** - Always visible. Shows aggregate stats + Place button. Prevents scroll-to-place friction.
6. **Tab bar styled like TradingView timeframe tabs** - Small, dense, pill-shaped. Not the current underline-style tabs.
7. **Toolbar ribbon replaces scattered controls** - Mode toggle, bulk stake, share/save/clear all in one horizontal strip below tabs.
8. **Inline stake editing** - Stake cells are editable `<input>` directly in the table row (no separate input section).
9. **Row hover highlight** - Subtle `hover:bg-muted/30` for scan-ability. Selected/active rows get `bg-primary/5` left border.
10. **Empty states** - Centered muted text, not card-wrapped messages.

## File Changes

### 1. `src/components/slip/SlipPage.tsx` (REWRITE)
- New TradingView terminal shell: tabs + toolbar + 3-column grid (main table | right panel) + bottom bar
- State: `activeTab`, `rightPanelOpen` (default true)
- Bottom bar: fixed at bottom, shows selection count, total stake, potential return, Place button
- Toolbar ribbon: mode toggle (Singles/Parlay), bulk stake input (singles mode), share/save/clear actions
- Right panel: collapsible, shows order summary per active tab

### 2. `src/components/slip/SlipTabs.tsx` (REWRITE)
- TradingView-style tab bar: small, dense, horizontal pills
- Active tab gets filled background (`bg-primary/15 text-primary`)
- Badge count shown as small monospace number inline
- Height: 32px, border-bottom separator

### 3. `src/components/slip/SlipVariantA.tsx` (REWRITE as ManualTab)
- Rename export to `ManualTab` (internal, SlipPage imports it)
- Full-height dense data table with columns: `# | Fixture | Market/Selection | Odds | Stake | Return | Status | X`
- Sticky table header
- Sortable columns (Odds, Time) - reuse existing sort logic
- Inline stake editing in the Stake column (singles mode only)
- Row-level status badges (Pending/Placed/Failed) using existing Badge component
- Empty state: centered muted text

### 4. `src/components/slip/ComputeSlipTable.tsx` (NEW FILE)
- Extracted from the inline `ComputeSlipCard` in SlipPage
- Grid of compute slip cards, each with:
  - Collapsible header (name + leg count)
  - Mode toggle (Singles/Parlay)
  - Selection sub-table (compact rows)
  - Stake Shield toggle (parlay, 3+ legs)
  - Summary row (total odds, stake, return)
  - Place/Clear button
- Dense card style: `border border-border/50 rounded` (not the current thick borders)

### 5. `src/components/slip/SavedSlipList.tsx` (NEW FILE)
- Extracted from the inline saved slips section in SlipPage
- Table-style list (not cards): rows with `name | legs | mode | date | actions`
- Load and Delete actions per row
- Empty state

### 6. `src/components/slip/SlipItem.tsx` (UPDATE)
- Minimal changes: ensure it works as a table row component
- Remove card-style `border rounded p-2.5` wrapper (parent controls layout)
- Keep content rendering (fixture, outcome, odds, stake input, status)

### 7. `src/components/slip/OrderPanel.tsx` (NEW FILE)
- Extracted right-side summary panel from SlipVariantA
- Shared across all 3 tabs with tab-specific content
- Manual tab: mode, selections count, combined odds, stake input, return, profit, stake shield, place button
- Compute tab: slip list summary, total permutations, aggregate stats
- Saved tab: slip count, total selections, quick-load action
- Collapsible via `rightPanelOpen` prop
- Width: 224px (`w-56`), border-left separator

### 8. `src/components/slip/BottomBar.tsx` (NEW FILE)
- Fixed bottom bar across all tabs
- Left: selection count + total stake
- Center: potential return (green) + potential profit
- Right: Place button (primary) / Clear button (after placement)
- Height: 48px, border-top separator, bg-card

### 9. `src/components/slip/ToolbarRibbon.tsx` (NEW FILE)
- Horizontal toolbar below tabs
- Left group: Mode toggle (Singles/Parlay pills)
- Center group: Bulk stake input (singles mode only) + Apply button
- Right group: Share | Save | Clear All action icons
- Height: 36px, border-bottom separator

## Component Tree (After Redesign)

```
SlipPage
├── SlipTabs (tab bar)
├── ToolbarRibbon (mode + bulk stake + actions)
├── div.flex-1.overflow-hidden (main content area)
│   ├── ManualTab (when activeTab === "manual")
│   │   └── Dense data table (full height)
│   ├── ComputeSlipTable (when activeTab === "compute")
│   │   └── Scrollable grid of compute slip cards
│   └── SavedSlipList (when activeTab === "saved")
│       └── Table-style saved slip list
├── OrderPanel (collapsible right panel, all tabs)
│   ├── Manual summary
│   ├── Compute summary
│   └── Saved summary
└── BottomBar (fixed bottom, all tabs)
```

## Design Tokens (No Changes Needed)
The existing dark theme tokens in [`index.css`](Git Files/src/index.css) are already TradingView-appropriate:
- Background: `#0a0d0f` (near-black)
- Card: `#111418` (dark surface)
- Border: `#1e2530` (subtle separators)
- Primary: `#10b981` (green accent for odds/CTAs)
- Odds up/down/stable colors already defined
- JetBrains Mono as mono font already loaded

## Constraints
- **No new dependencies** - reuse existing: Tailwind, framer-motion (for panel collapse), lucide-react icons, recharts (if sparklines needed), Radix primitives
- **Preserve all business logic** - store hooks, slip calculations, bet placement, compute pipeline unchanged
- **Preserve BetSlipDrawer** - global overlay drawer stays as-is (it duplicates some functionality but serves a different UX path)
- **Mobile collapse** - at `< 768px`: right panel hidden by default, bottom bar stays, table scrolls horizontally
- **No em-dashes** anywhere in new code
- **Zero AI tells** - no purple gradients, no glassmorphism, no decorative elements
