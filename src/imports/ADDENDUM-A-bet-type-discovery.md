═══════════════════════════════════════════════════════════════════════════════
ADDENDUM A: BET TYPE-CENTRIC DISCOVERY — UI SEGMENT UPDATE
═══════════════════════════════════════════════════════════════════════════════

SCOPE: This addendum modifies the Discovery Engine components to make 
"Bet Type" the PRIMARY discovery dimension, while preserving ALL other 
UI components, contracts, and architecture from the original Segment 1 prompt.

ONLY THESE FILES ARE MODIFIED/ADDED:
- lib/contracts/ui.contract.ts (ADD 3 interfaces, MODIFY 1)
- lib/utils/bet-type-mapper.ts (NEW)
- components/discovery/SearchFilterBar.tsx (MODIFY)
- components/discovery/ResultsTable.tsx (MODIFY column logic)
- components/discovery/MarketBrowser.tsx (MODIFY organization)
- components/discovery/BulkMarketApplier.tsx (MODIFY)
- components/discovery/BetTypeSelector.tsx (NEW)
- components/discovery/BetTypeLineSelector.tsx (NEW)
- components/discovery/FixtureRow.tsx (MODIFY — bet type odds display)
- hooks/useDiscovery.ts (MODIFY mock — add betType/betTypeLine)
- lib/utils/mock-data.ts (MODIFY — add bet type data)

ALL OTHER FILES REMAIN EXACTLY AS ORIGINALLY SPECIFIED.

───────────────────────────────────────────────────────────────────────────────
SECTION A1: CONTRACT ADDITIONS (lib/contracts/ui.contract.ts)
───────────────────────────────────────────────────────────────────────────────

ADD these interfaces (append to existing file, do not remove anything):

// ─── Bet Type System ───

export interface BetTypeConfig {
  id: string;                    // URL-safe slug: "corners-over-under"
  name: string;                  // Display name: "Corners Over/Under"
  description: string;           // "Total corners over or under a line"
  icon: string;                  // Lucide icon name: "Flag"
  category: string;              // Grouping: "goals", "corners", "cards", "match", "players", "specials"
  templates: string[];           // Stake template names that map to this bet type
  lines?: string[];              // Available lines: ["8.5", "9.5", "10.5", "11.5"]
  hasLines: boolean;             // true if this bet type has multiple lines
  popular: boolean;              // Show in "Popular" section
}

export interface BetTypeLineConfig {
  line: string;                  // "9.5"
  overOdds?: number;             // Average over odds (for display)
  underOdds?: number;            // Average under odds (for display)
  label: string;                 // "Over/Under 9.5"
}

export interface DiscoveryFilters {
  sport: string;
  betType: string | null;        // NEW: Primary bet type filter (e.g., "corners-over-under")
  betTypeLine: string | null;    // NEW: Specific line (e.g., "9.5") — null if bet type has no lines
  group: string;                 // Kept for API compatibility, auto-derived from betType
  dateFrom: number | null;
  dateTo: number | null;
  tournamentSlugs: string[];
  searchQuery: string;
}

// MODIFY FixtureRowProps to include bet type display:
export interface FixtureRowProps {
  fixture: {
    id: string;
    name: string;
    slug: string;
    startTime: string;
    status: string;
    isLive?: boolean;
    homeScore?: number;
    awayScore?: number;
    tournament: { name: string; category: { name: string } };
    competitors: Array<{ name: string; iconPath?: string }>;
    // NEW: Pre-computed bet type info for this fixture
    betTypeInfo?: {
      betTypeName: string;       // "Corners Over/Under"
      line: string | null;       // "9.5" or null
      overOutcome?: { name: string; odds: number; active: boolean; id: string };
      underOutcome?: { name: string; odds: number; active: boolean; id: string };
      singleOutcome?: { name: string; odds: number; active: boolean; id: string }; // For non-line bet types
      available: boolean;        // Does this fixture have this bet type?
    };
  };
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onViewMarkets: () => void;
  onAddSelection: (selection: BetSelection) => void;
}

// ADD to BetSelection interface:
export interface BetSelection {
  id: string;
  fixtureSlug: string;
  fixtureName: string;
  fixtureId: string;
  tournamentName: string;
  marketId: string;
  marketName: string;
  outcomeId: string;
  outcomeName: string;
  odds: number;
  active: boolean;
  startTime: string;
  addedAt: number;
  // NEW:
  betType: string;               // "Corners Over/Under"
  betTypeLine: string | null;    // "9.5" or null
}

───────────────────────────────────────────────────────────────────────────────
SECTION A2: BET TYPE MAPPER (lib/utils/bet-type-mapper.ts) — NEW FILE
───────────────────────────────────────────────────────────────────────────────

This is the SINGLE SOURCE OF TRUTH for bet type mapping.
All discovery components import from here.

import { BetTypeConfig } from "@/lib/contracts/ui.contract";

export const BET_TYPES: BetTypeConfig[] = [
  {
    id: "match-winner",
    name: "Match Winner",
    description: "Home win, Draw, or Away win",
    icon: "Trophy",
    category: "match",
    templates: ["1x2", "winner", "match_winner", "moneyline", "3way"],
    hasLines: false,
    popular: true,
  },
  {
    id: "over-under-goals",
    name: "Over/Under Goals",
    description: "Total goals over or under a line",
    icon: "Goal",
    category: "goals",
    templates: ["Asian Total", "total_goals", "over_under", "totals"],
    lines: ["0.5", "1.5", "2.5", "3.5", "4.5", "5.5"],
    hasLines: true,
    popular: true,
  },
  {
    id: "asian-handicap",
    name: "Asian Handicap",
    description: "Team starts with virtual advantage/disadvantage",
    icon: "Scale",
    category: "match",
    templates: ["Asian Handicap", "handicap", "spread", "ah"],
    lines: ["0.0", "0.25", "0.5", "0.75", "1.0", "1.25", "1.5", "1.75", "2.0"],
    hasLines: true,
    popular: true,
  },
  {
    id: "btts",
    name: "Both Teams to Score",
    description: "Will both teams score?",
    icon: "CheckCircle2",
    category: "goals",
    templates: ["Both Teams to Score", "btts", "both_teams_score"],
    hasLines: false,
    popular: true,
  },
  {
    id: "correct-score",
    name: "Correct Score",
    description: "Exact final score",
    icon: "Target",
    category: "match",
    templates: ["Correct Score", "correct_score", "cs"],
    hasLines: false,
    popular: false,
  },
  {
    id: "ht-ft",
    name: "Half-Time/Full-Time",
    description: "Result at half-time and full-time",
    icon: "Clock",
    category: "match",
    templates: ["Halftime/Fulltime", "ht_ft", "half_time_full_time"],
    hasLines: false,
    popular: false,
  },
  {
    id: "first-goalscorer",
    name: "First Goalscorer",
    description: "Player to score first goal",
    icon: "User",
    category: "players",
    templates: ["First Goalscorer", "first_scorer", "fg"],
    hasLines: false,
    popular: false,
  },
  {
    id: "anytime-goalscorer",
    name: "Anytime Goalscorer",
    description: "Player to score anytime",
    icon: "UserCheck",
    category: "players",
    templates: ["Anytime Goalscorer", "anytime_scorer", "ags"],
    hasLines: false,
    popular: false,
  },
  {
    id: "corners-over-under",
    name: "Corners Over/Under",
    description: "Total corners over or under a line",
    icon: "Flag",
    category: "corners",
    templates: ["Corner Total", "corners", "asian_corner", "corner_ou", "total_corners"],
    lines: ["8.5", "9.5", "10.5", "11.5", "12.5", "13.5"],
    hasLines: true,
    popular: true,
  },
  {
    id: "corner-handicap",
    name: "Corner Handicap",
    description: "Corner count with handicap",
    icon: "FlagTriangleRight",
    category: "corners",
    templates: ["Corner Handicap", "corner_handicap", "corner_spread"],
    lines: ["0.0", "0.5", "1.0", "1.5", "2.0", "2.5", "3.0"],
    hasLines: true,
    popular: false,
  },
  {
    id: "cards-over-under",
    name: "Cards Over/Under",
    description: "Total cards over or under a line",
    icon: "Square",
    category: "cards",
    templates: ["Card Total", "cards", "booking_points", "total_cards", "card_ou"],
    lines: ["3.5", "4.5", "5.5", "6.5", "7.5"],
    hasLines: true,
    popular: false,
  },
  {
    id: "clean-sheet",
    name: "Clean Sheet",
    description: "Team keeps clean sheet",
    icon: "Shield",
    category: "match",
    templates: ["Clean Sheet", "clean_sheet", "to_keep_clean_sheet"],
    hasLines: false,
    popular: false,
  },
  {
    id: "win-to-nil",
    name: "Win to Nil",
    description: "Win without conceding",
    icon: "ShieldCheck",
    category: "match",
    templates: ["Win to Nil", "win_to_nil", "win_without_conceding"],
    hasLines: false,
    popular: false,
  },
  {
    id: "double-chance",
    name: "Double Chance",
    description: "Two outcomes in one bet",
    icon: "GitFork",
    category: "match",
    templates: ["Double Chance", "double_chance", "dc"],
    hasLines: false,
    popular: false,
  },
  {
    id: "draw-no-bet",
    name: "Draw No Bet",
    description: "Stake returned if draw",
    icon: "Undo2",
    category: "match",
    templates: ["Draw No Bet", "draw_no_bet", "dnb"],
    hasLines: false,
    popular: false,
  },
];

// ─── Helper Functions ───

export function getBetTypeById(id: string): BetTypeConfig | undefined {
  return BET_TYPES.find(bt => bt.id === id);
}

export function getBetTypeByTemplate(templateName: string): BetTypeConfig | undefined {
  const lower = templateName.toLowerCase();
  return BET_TYPES.find(bt => 
    bt.templates.some(t => lower.includes(t.toLowerCase()))
  );
}

export function getPopularBetTypes(): BetTypeConfig[] {
  return BET_TYPES.filter(bt => bt.popular);
}

export function getBetTypesByCategory(category: string): BetTypeConfig[] {
  return BET_TYPES.filter(bt => bt.category === category);
}

export function getAllCategories(): string[] {
  return Array.from(new Set(BET_TYPES.map(bt => bt.category)));
}

export function getLinesForBetType(betTypeId: string): string[] {
  const bt = getBetTypeById(betTypeId);
  return bt?.lines || [];
}

export function hasLines(betTypeId: string): boolean {
  const bt = getBetTypeById(betTypeId);
  return bt?.hasLines || false;
}

export function getGroupForBetType(betTypeId: string): string {
  // Maps bet type to Stake API group parameter
  const bt = getBetTypeById(betTypeId);
  if (!bt) return "main";

  // Map categories to Stake groups
  const categoryToGroup: Record<string, string> = {
    match: "main",
    goals: "main",
    corners: "corners",
    cards: "cards",
    players: "main",
    specials: "specials",
  };

  return categoryToGroup[bt.category] || "main";
}

// ─── Fixture Matching ───

export interface MatchedBetType {
  betType: BetTypeConfig;
  line: string | null;
  overOutcome?: { id: string; name: string; odds: number; active: boolean };
  underOutcome?: { id: string; name: string; odds: number; active: boolean };
  singleOutcome?: { id: string; name: string; odds: number; active: boolean };
  marketId: string;
  marketName: string;
}

export function findBetTypeInFixture(
  fixture: any, // StakeFixture
  betTypeId: string,
  line?: string | null
): MatchedBetType | null {
  const betType = getBetTypeById(betTypeId);
  if (!betType) return null;

  // Search through all groups and templates
  for (const group of fixture.groups || []) {
    for (const template of group.templates) {
      const matchedType = getBetTypeByTemplate(template.name);
      if (matchedType?.id !== betTypeId) continue;

      for (const market of template.markets || []) {
        // For line-based bet types, match the line
        if (betType.hasLines && line) {
          const marketLine = extractLine(market.name);
          if (marketLine !== line) continue;

          const over = market.outcomes.find((o: any) => 
            o.name.toLowerCase().includes("over")
          );
          const under = market.outcomes.find((o: any) => 
            o.name.toLowerCase().includes("under")
          );

          if (over || under) {
            return {
              betType,
              line,
              overOutcome: over ? { id: over.id, name: over.name, odds: over.odds, active: over.active } : undefined,
              underOutcome: under ? { id: under.id, name: under.name, odds: under.odds, active: under.active } : undefined,
              marketId: market.id,
              marketName: market.name,
            };
          }
        } else {
          // Non-line bet type — return first active outcome
          const activeOutcome = market.outcomes.find((o: any) => o.active);
          if (activeOutcome) {
            return {
              betType,
              line: null,
              singleOutcome: { id: activeOutcome.id, name: activeOutcome.name, odds: activeOutcome.odds, active: activeOutcome.active },
              marketId: market.id,
              marketName: market.name,
            };
          }
        }
      }
    }
  }

  return null;
}

export function extractLine(marketName: string): string | null {
  const match = marketName.match(/(\d+\.\d+)/);
  return match ? match[1] : null;
}

export function getAvailableBetTypesForFixture(fixture: any): string[] {
  const types = new Set<string>();
  for (const group of fixture.groups || []) {
    for (const template of group.templates) {
      const bt = getBetTypeByTemplate(template.name);
      if (bt) types.add(bt.id);
    }
  }
  return Array.from(types);
}

export function getAvailableLinesForBetTypeInFixture(
  fixture: any,
  betTypeId: string
): string[] {
  const betType = getBetTypeById(betTypeId);
  if (!betType?.hasLines) return [];

  const lines = new Set<string>();
  for (const group of fixture.groups || []) {
    for (const template of group.templates) {
      const matched = getBetTypeByTemplate(template.name);
      if (matched?.id !== betTypeId) continue;

      for (const market of template.markets || []) {
        const line = extractLine(market.name);
        if (line) lines.add(line);
      }
    }
  }

  return Array.from(lines).sort((a, b) => parseFloat(a) - parseFloat(b));
}

───────────────────────────────────────────────────────────────────────────────
SECTION A3: NEW COMPONENT — BetTypeSelector (components/discovery/BetTypeSelector.tsx)
───────────────────────────────────────────────────────────────────────────────

Primary bet type selection component. Replaces the generic "Market Group" 
selector in SearchFilterBar.

Props:
  value: string | null;        // Selected bet type ID
  onChange: (betTypeId: string | null) => void;
  sport?: string;              // Filter bet types by sport relevance

Features:
- Dropdown with search
- Organized by category: Popular, Match, Goals, Corners, Cards, Players, Specials
- Each item shows: icon, name, description
- "All Bet Types" option at top
- Highlight popular bet types
- Disable bet types not available for current sport (future enhancement)

Visual:
┌─────────────────────────────────────────────────────────┐
│  ▼ Select Bet Type                                       │
├─────────────────────────────────────────────────────────┤
│  🔥 POPULAR                                              │
│  ⚽ Match Winner                                         │
│  📊 Over/Under Goals                                     │
│  🔄 Both Teams to Score                                  │
│  🚩 Corners Over/Under                                   │
│  ─────────────────────────────────────────────────────  │
│  ⚽ MATCH                                                │
│  📊 Asian Handicap                                       │
│  🎯 Correct Score                                        │
│  ⏱️ Half-Time/Full-Time                                  │
│  🛡️ Clean Sheet                                          │
│  🛡️ Win to Nil                                           │
│  🔄 Double Chance                                        │
│  ↩️ Draw No Bet                                          │
│  ─────────────────────────────────────────────────────  │
│  🚩 CORNERS                                              │
│  🚩 Corner Handicap                                      │
│  ─────────────────────────────────────────────────────  │
│  🟨 CARDS                                                │
│  🟨 Cards Over/Under                                     │
│  ─────────────────────────────────────────────────────  │
│  👤 PLAYERS                                              │
│  👤 First Goalscorer                                     │
│  👤 Anytime Goalscorer                                   │
└─────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
SECTION A4: NEW COMPONENT — BetTypeLineSelector (components/discovery/BetTypeLineSelector.tsx)
───────────────────────────────────────────────────────────────────────────────

Conditional component — only shows when selected bet type has lines.

Props:
  betTypeId: string;
  value: string | null;
  onChange: (line: string | null) => void;
  availableLines?: string[];   // Filter to only show lines available in fixtures

Features:
- Horizontal button group (mobile-friendly)
- Or dropdown for many lines
- Shows "Over / Under" preview with avg odds if available
- Disabled state for lines not available

Visual (for Corners Over/Under):
┌─────────────────────────────────────────────────────────┐
│  Line: [8.5] [9.5] [10.5] [11.5] [12.5] [13.5]       │
│         ↑ selected                                        │
│  Preview: Over 9.5 ~@1.85  |  Under 9.5 ~@1.95        │
└─────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
SECTION A5: MODIFIED — SearchFilterBar (components/discovery/SearchFilterBar.tsx)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL:

1. REPLACE "Market Group" dropdown with "BetTypeSelector" component
2. ADD "BetTypeLineSelector" conditionally (only when bet type has lines)
3. REMOVE generic "Market Group" filter (replaced by bet type)
4. KEEP all other filters: Sport, Date Range, League, Search, Save/Load

Layout:
┌─────────────────────────────────────────────────────────────────────────────┐
│  DISCOVER BETS                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sport: [Soccer ▼]   Bet Type: [Corners Over/Under ▼]   Date: [Today ▼]   │
│                                                                             │
│  Line: [8.5] [9.5] [10.5] [11.5]          League: [All Leagues ▼]        │
│                                                                             │
│  [🔍 Search Matches]      [💾 Save Filter]                                  │
│                                                                             │
│  Active: Sport: Soccer | Bet Type: Corners O/U | Line: 9.5 | Today [×]  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

State changes:
- filters.betType: string | null (replaces filters.group as primary)
- filters.betTypeLine: string | null (new)
- filters.group: auto-derived from betType via getGroupForBetType()

When betType changes:
1. Reset betTypeLine to default (first line or null)
2. Auto-set group for API call
3. Trigger search

When betTypeLine changes:
1. Update filter
2. Re-filter results client-side (no new API call needed if fixtures cached)

───────────────────────────────────────────────────────────────────────────────
SECTION A6: MODIFIED — FixtureRow (components/discovery/FixtureRow.tsx)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL:

The "Preview Markets" column is REPLACED with a "Bet Type" column that shows 
the specific bet type + line + odds for the currently selected filter.

Visual (for "Corners Over/Under" + line "9.5"):

┌─────┬─────────────────────────────┬──────────────┬─────────┬────────────────────────┐
│  ☐  │ Match                       │ League       │ Time    │ Corners: Over 9.5      │
├─────┼─────────────────────────────┼──────────────┼─────────┼────────────────────────┤
│  ☐  │ Crystal Palace vs Man City  │ Premier Lg   │ 15:30   │ @ 1.90  [+ Add]        │
│  ☐  │ Arsenal vs Liverpool        │ Premier Lg   │ 18:00   │ @ 1.85  [+ Add]        │
│  ☐  │ Chelsea vs Tottenham        │ Premier Lg   │ 20:15   │ Not Available          │
│  ☐  │ Man Utd vs Brighton         │ Premier Lg   │ 16:00   │ @ 1.88  [+ Add]        │
└─────┴─────────────────────────────┴──────────────┴─────────┴────────────────────────┘

For line-based bet types (Over/Under, Corners, Cards, Handicap):
- Show ONE odds button for the "Over" outcome (default)
- Click to add to slip
- "View Markets" button to see both Over/Under in MarketBrowser
- "Not Available" if this bet type/line doesn't exist for this fixture

For non-line bet types (Match Winner, BTTS, Correct Score):
- Show the primary outcome (e.g., "Home Win @ 1.63")
- Or show all outcomes compactly: "1.63 / 4.20 / 1.90"

Props addition:
  betTypeInfo?: FixtureRowProps["fixture"]["betTypeInfo"];

───────────────────────────────────────────────────────────────────────────────
SECTION A7: MODIFIED — ResultsTable (components/discovery/ResultsTable.tsx)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL:

1. Column header changes from "Preview Markets" to "Bet Type: {betTypeName}"
2. If line selected: "Bet Type: {betTypeName} — {line}"
3. Each row uses FixtureRow with betTypeInfo pre-computed
4. Bulk actions toolbar updated:
   - "Apply {betTypeName} to Selected" (with line if applicable)

Bulk actions (when bet type is selected):
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☑ 5 matches selected                                                      │
│  [Apply "Corners Over/Under — Over 9.5" to 5 matches]  [Add to Slip]       │
└─────────────────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
SECTION A8: MODIFIED — MarketBrowser (components/discovery/MarketBrowser.tsx)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL:

Reorganize from "template-based" to "bet-type-based" display.

Structure:
1. FIXTURE HEADER (unchanged)
2. QUICK BET TYPES (horizontal scrollable chips)
   - Popular bet types for this fixture
   - Click to jump to that section

3. BET TYPE SECTIONS (organized by category)
   Each section:
   - Category header with icon ("🚩 CORNERS")
   - Bet type name ("Corners Over/Under")
   - Markets displayed as OddsButton grids
   - For line-based: show Over/Under pairs side by side

   Example:
   ┌─────────────────────────────────────────────────────────────┐
   │  🚩 CORNERS                                                  │
   │                                                              │
   │  Corners Over/Under                                          │
   │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
   │  │ Over 8.5        │ │ Over 9.5        │ │ Over 10.5       ││
   │  │ @ 1.90          │ │ @ 1.75   ✓      │ │ @ 1.60          ││
   │  │ [+ Add]         │ │ [Added]         │ │ [+ Add]         ││
   │  └─────────────────┘ └─────────────────┘ └─────────────────┘│
   │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
   │  │ Under 8.5       │ │ Under 9.5       │ │ Under 10.5      ││
   │  │ @ 1.90          │ │ @ 2.10          │ │ @ 2.35          ││
   │  │ [+ Add]         │ │ [+ Add]         │ │ [+ Add]         ││
   │  └─────────────────┘ └─────────────────┘ └─────────────────┘│
   │                                                              │
   │  Corner Handicap                                             │
   │  ┌─────────────────┐ ┌─────────────────┐                    │
   │  │ Home +1.5       │ │ Home +2.5       │                    │
   │  │ @ 1.85          │ │ @ 1.65          │                    │
   │  └─────────────────┘ └─────────────────┘                    │
   └─────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
SECTION A9: MODIFIED — BulkMarketApplier (components/discovery/BulkMarketApplier.tsx)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL:

Now operates on BET TYPES, not generic market templates.

When user selects multiple fixtures and clicks bulk action:

1. If a bet type is already selected in filters:
   - Show: "Apply 'Corners Over/Under — Over 9.5' to 5 matches?"
   - One-click apply

2. If no bet type selected:
   - Show dropdown of bet types available across ALL selected fixtures
   - After selecting bet type, show line selector (if applicable)
   - Show preview before apply

Preview table:
┌─────────────────────────────────────────────────────────────────┐
│  Apply "Corners Over/Under — Over 9.5" to 5 matches?          │
├─────────────────────────────────────────────────────────────────┤
│  Match                           │ Odds  │ Status             │
├──────────────────────────────────┼───────┼────────────────────┤
│  Crystal Palace vs Man City      │ 1.90  │ ✓ Available        │
│  Arsenal vs Liverpool            │ 1.85  │ ✓ Available        │
│  Chelsea vs Tottenham            │ —     │ ✗ Not Available    │
│  Man Utd vs Brighton             │ 1.88  │ ✓ Available        │
│  Newcastle vs Aston Villa        │ 1.95  │ ✓ Available        │
├──────────────────────────────────┼───────┼────────────────────┤
│  Total: 4 of 5 matches available                              │
│                                                                 │
│              [Cancel]    [Apply to 4 Matches]                   │
└─────────────────────────────────────────────────────────────────┘

───────────────────────────────────────────────────────────────────────────────
SECTION A10: MODIFIED — useDiscovery hook (hooks/useDiscovery.ts)
───────────────────────────────────────────────────────────────────────────────

CHANGES FROM ORIGINAL MOCK:

Add to filters and return value:

export function useDiscovery() {
  return {
    filters: {
      sport: "soccer",
      betType: "corners-over-under",      // NEW
      betTypeLine: "9.5",                // NEW
      group: "corners",                   // AUTO-derived from betType
      dateFrom: Date.now() / 1000,
      dateTo: Date.now() / 1000 + 86400 * 7,
      tournamentSlugs: [],
      searchQuery: "",
    },
    setFilters: () => {},
    // NEW: Pre-computed bet type info for each fixture
    fixtures: Array<StakeFixture & { betTypeInfo: BetTypeInfo }>,
    isLoading: false,
    error: null,
    refetch: async () => {},
    tournaments: StakeTournament[],
    betTypes: BetTypeConfig[],           // NEW: All available bet types
    popularBetTypes: BetTypeConfig[],    // NEW: Popular subset
  };
}

Mock data generators must pre-compute betTypeInfo for each fixture 
based on the selected betType and betTypeLine.

───────────────────────────────────────────────────────────────────────────────
SECTION A11: MODIFIED — Mock Data (lib/utils/mock-data.ts)
───────────────────────────────────────────────────────────────────────────────

ADD mock data that includes:

1. Fixtures with realistic bet type distributions:
   - 100% have Match Winner
   - 90% have Over/Under Goals
   - 80% have BTTS
   - 70% have Corners Over/Under
   - 50% have Cards Over/Under
   - 30% have Asian Handicap
   - 20% have Correct Score
   - etc.

2. Realistic lines and odds for each bet type:
   - Corners: 8.5-13.5, odds 1.60-2.10
   - Goals: 0.5-5.5, odds 1.70-2.00
   - Cards: 3.5-7.5, odds 1.75-2.05

3. Some fixtures missing certain bet types (for "Not Available" testing)

───────────────────────────────────────────────────────────────────────────────
SECTION A12: USER WORKFLOW EXAMPLES
───────────────────────────────────────────────────────────────────────────────

WORKFLOW 1: "Bet on corners for all matches on Aug 25"

1. User opens Discovery
2. Selects Sport: Soccer
3. Selects Bet Type: "Corners Over/Under" (from dropdown)
4. Line selector appears: [8.5] [9.5] [10.5] [11.5]
5. User clicks [9.5]
6. Selects Date: August 25, 2026
7. Clicks Search
8. Results show ONLY matches with Corners Over/Under 9.5 available
   ┌─────┬─────────────────────────────┬──────────┬─────────┬────────────────────────┐
   │  ☐  │ Match                       │ League   │ Time    │ Corners: Over 9.5     │
   ├─────┼─────────────────────────────┼──────────┼─────────┼────────────────────────┤
   │  ☐  │ Crystal Palace vs Man City  │ Prem Lg  │ 15:30   │ @ 1.90  [+ Add]       │
   │  ☐  │ Arsenal vs Liverpool        │ Prem Lg  │ 18:00   │ @ 1.85  [+ Add]       │
   │  ☐  │ Chelsea vs Tottenham        │ Prem Lg  │ 20:15   │ Not Available         │
   │  ☐  │ Man Utd vs Brighton         │ Prem Lg  │ 16:00   │ @ 1.88  [+ Add]       │
   └─────┴─────────────────────────────┴──────────┴─────────┴────────────────────────┘
9. User checks all 4 available matches
10. Clicks "Add All to Slip"
11. Slip shows 4 selections, all "Corners Over 9.5"
12. User enters ₦100 stake per leg
13. Clicks "Place All Bets"
14. 4 bets placed individually, results shown

WORKFLOW 2: "Bet on match winners for weekend matches"

1. User selects Bet Type: "Match Winner"
2. No line selector (hasLines: false)
3. Selects Date: This Weekend
4. Clicks Search
5. Results show home/draw/away odds compactly:
   ┌─────┬─────────────────────────────┬──────────┬─────────┬────────────────────────┐
   │  ☐  │ Match                       │ League   │ Time    │ Match Winner          │
   ├─────┼─────────────────────────────┼──────────┼─────────┼────────────────────────┤
   │  ☐  │ Crystal Palace vs Man City  │ Prem Lg  │ 15:30   │ 5.00 / 4.20 / 1.63    │
   │  ☐  │ Arsenal vs Liverpool        │ Prem Lg  │ 18:00   │ 2.10 / 3.40 / 3.20    │
   └─────┴─────────────────────────────┴──────────┴─────────┴────────────────────────┘
6. User clicks on "1.63" (Man City) for first match
7. User clicks on "2.10" (Arsenal) for second match
8. Slip shows 2 selections with different outcomes
9. User places as singles

───────────────────────────────────────────────────────────────────────────────
SECTION A13: BACKWARD COMPATIBILITY CHECKLIST
───────────────────────────────────────────────────────────────────────────────

These components REMAIN EXACTLY as originally specified:
[✓] All layout components (AppShell, TopBar, SideNav, BetSlipDrawer, etc.)
[✓] All slip components (SlipItem, ModeToggle, StakeInput, PlaceButton, etc.)
[✓] All history components (BetHistoryTable, BetDetailModal, Charts, etc.)
[✓] All analytics components (KPIOverview, ProfitLossChart, etc.)
[✓] All settings components (ApiTokenInput, PresetsManager, etc.)
[✓] All UI design system components (Button, Input, Badge, Card, etc.)
[✓] All utility hooks (useLocalStorage, useDebounce, etc.)
[✓] All page components except discovery/page.tsx
[✓] All contract files except additions noted above
[✓] All config files

These components are MODIFIED:
[△] SearchFilterBar — Add BetTypeSelector, BetTypeLineSelector
[△] ResultsTable — Bet type column instead of preview markets
[△] FixtureRow — Bet type odds display
[△] MarketBrowser — Bet-type-based organization
[△] BulkMarketApplier — Bet type application logic
[△] useDiscovery mock — Add betType/betTypeLine
[△] mock-data.ts — Add bet type distributions

These components are NEW:
[+] BetTypeSelector
[+] BetTypeLineSelector
[+] lib/utils/bet-type-mapper.ts

────────────────────────────────────────────────═══════════════════════════════
END OF ADDENDUM A
═══════════════════════════════════════════════════════════════════════════════
