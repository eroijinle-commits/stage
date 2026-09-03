═══════════════════════════════════════════════════════════════════════════════
SEGMENT 1: UI FOUNDATION & DESIGN SYSTEM — IMPLEMENTATION PROMPT
═══════════════════════════════════════════════════════════════════════════════

AGENT ROLE: Senior Frontend Engineer — Design System & UI Architecture
PRIORITY: HIGHEST (All other segments depend on this)
PHILOSOPHY: UI-First, Data-Second. Build with complete mock data.
Backend segments plug in later by replacing hooks.

───────────────────────────────────────────────────────────────────────────────
SECTION 0: PROJECT SETUP (Create these config files first)
───────────────────────────────────────────────────────────────────────────────

FILE: package.json
{
"name": "stakebet-batch",
"version": "1.0.0",
"private": true,
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"test": "vitest",
"test:ui": "vitest --ui",
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"db:seed": "tsx lib/db/seed.ts"
},
"dependencies": {
"next": "^14.2.0",
"react": "^18.3.0",
"react-dom": "^18.3.0",
"@neondatabase/serverless": "^0.9.0",
"drizzle-orm": "^0.31.0",
"zustand": "^4.5.0",
"@tanstack/react-query": "^5.40.0",
"react-hook-form": "^7.51.0",
"@hookform/resolvers": "^3.4.0",
"zod": "^3.23.0",
"recharts": "^2.12.0",
"lucide-react": "^0.378.0",
"clsx": "^2.1.0",
"tailwind-merge": "^2.3.0",
"date-fns": "^3.6.0",
"framer-motion": "^11.0.0",
"sonner": "^1.4.0",
"@radix-ui/react-dialog": "^1.0.0",
"@radix-ui/react-dropdown-menu": "^2.0.0",
"@radix-ui/react-select": "^2.0.0",
"@radix-ui/react-tabs": "^1.0.0",
"@radix-ui/react-tooltip": "^1.0.0",
"@radix-ui/react-popover": "^1.0.0",
"@radix-ui/react-slider": "^1.0.0",
"@radix-ui/react-switch": "^1.0.0",
"@radix-ui/react-accordion": "^1.0.0"
},
"devDependencies": {
"typescript": "^5.4.0",
"@types/node": "^20.0.0",
"@types/react": "^18.3.0",
"@types/react-dom": "^18.3.0",
"tailwindcss": "^3.4.0",
"postcss": "^8.4.0",
"autoprefixer": "^10.4.0",
"eslint": "^8.0.0",
"eslint-config-next": "^14.2.0",
"vitest": "^1.6.0",
"@testing-library/react": "^15.0.0",
"@testing-library/jest-dom": "^6.4.0",
"jsdom": "^24.0.0",
"drizzle-kit": "^0.22.0",
"tsx": "^4.11.0"
}
}

FILE: tsconfig.json
{
"compilerOptions": {
"lib": ["dom", "dom.iterable", "esnext"],
"allowJs": true,
"skipLibCheck": true,
"strict": true,
"noEmit": true,
"esModuleInterop": true,
"module": "esnext",
"moduleResolution": "bundler",
"resolveJsonModule": true,
"isolatedModules": true,
"jsx": "preserve",
"incremental": true,
"plugins": [{ "name": "next" }],
"paths": {
"@/_": ["./_"],
"@/components/_": ["./components/_"],
"@/hooks/_": ["./hooks/_"],
"@/lib/_": ["./lib/_"],
"@/types/_": ["./types/_"],
"@/utils/_": ["./lib/utils/_"]
}
},
"include": ["next-env.d.ts", "**/\*.ts", "**/_.tsx", ".next/types/\**/_.ts"],
"exclude": ["node_modules"]
}

FILE: tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
content: [
"./pages/**/\*.{js,ts,jsx,tsx,mdx}",
"./components/**/_.{js,ts,jsx,tsx,mdx}",
"./app/\**/_.{js,ts,jsx,tsx,mdx}",
],
darkMode: "class",
theme: {
extend: {
colors: {
odds: { up: "#22c55e", down: "#ef4444", stable: "#3b82f6" },
market: { active: "#3b82f6", suspended: "#6b7280", locked: "#f59e0b" },
bet: { won: "#22c55e", lost: "#ef4444", pending: "#f59e0b", cancelled: "#6b7280", cashout: "#8b5cf6" },
brand: {
50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
800: "#065f46", 900: "#064e3b", 950: "#022c22",
},
},
fontFamily: {
sans: ["Inter", "system-ui", "sans-serif"],
mono: ["JetBrains Mono", "monospace"],
},
animation: {
"pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
"slide-in-right": "slideInRight 0.3s ease-out",
"slide-out-right": "slideOutRight 0.3s ease-in",
"fade-in": "fadeIn 0.2s ease-out",
"scale-in": "scaleIn 0.2s ease-out",
"bounce-subtle": "bounceSubtle 0.5s ease-in-out",
},
keyframes: {
slideInRight: { "0%": { transform: "translateX(100%)", opacity: "0" }, "100%": { transform: "translateX(0)", opacity: "1" } },
slideOutRight: { "0%": { transform: "translateX(0)", opacity: "1" }, "100%": { transform: "translateX(100%)", opacity: "0" } },
fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
scaleIn: { "0%": { transform: "scale(0.95)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
bounceSubtle: { "0%, 100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-4px)" } },
},
},
},
plugins: [],
};

export default config;

FILE: postcss.config.js
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };

FILE: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
reactStrictMode: true,
images: { domains: ["stake.com", "cdn.sportradar.com"] },
};
module.exports = nextConfig;

FILE: drizzle.config.ts
import { defineConfig } from "drizzle-kit";
export default defineConfig({
schema: "./lib/db/schema.ts",
out: "./lib/db/migrations",
dialect: "postgresql",
dbCredentials: { url: process.env.DATABASE_URL! },
});

FILE: .env.example
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
STAKE_API_TOKEN="your_stake_api_token_here"
NEXT_PUBLIC_APP_NAME="StakeBet Batch"
NEXT_PUBLIC_DEFAULT_CURRENCY="ngn"
NEXT_PUBLIC_DEFAULT_ODDS_FORMAT="decimal"

FILE: .gitignore
node_modules/
.next/
out/
dist/
.env.local
.env.*.local
data/
*.db
*.db-journal
.vscode/
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db
coverage/
*.log

───────────────────────────────────────────────────────────────────────────────
SECTION 1: SHARED CONTRACTS (lib/contracts/)
───────────────────────────────────────────────────────────────────────────────

These contracts are THE SINGLE SOURCE OF TRUTH. Every segment reads from here.

FILE: lib/contracts/api.contract.ts
export interface StakeSport { id: string; name: string; slug: string; }
export interface StakeCategory { id: string; name: string; slug: string; countryCode?: string; sport: StakeSport; }
export interface StakeTournament { id: string; name: string; slug: string; category: StakeCategory; fixtureCount?: number; }
export interface StakeFixtureCompetitor { name: string; defaultName: string; extId: string; countryCode?: string; abbreviation?: string; iconPath?: string; country?: string; }
export interface StakeFixtureDataMatch { __typename: "SportFixtureDataMatch"; startTime: string; isOutright: boolean; competitors: StakeFixtureCompetitor[]; teams?: Array<{ extId: string; name: string; qualifier: string }>; }
export interface StakeFixtureDataOutright { __typename: "SportFixtureDataOutright"; name: string; startTime: string; endTime?: string; isOutright: boolean; }
export type StakeFixtureData = StakeFixtureDataMatch | StakeFixtureDataOutright;
export interface StakeFixtureEventStatus { matchStatus: string; homeScore?: number; awayScore?: number; homeGameScore?: number; awayGameScore?: number; clock?: { matchTime: string; remainingTime?: string; stopped: boolean }; periodScores?: Array<{ homeScore: number; awayScore: number; matchStatus: string }>; statistic?: { corners?: { home: number; away: number }; yellowCards?: { home: number; away: number }; redCards?: { home: number; away: number } }; currentTeamServing?: string; }
export interface StakeFixture { id: string; name: string; slug: string; status: string; provider: string; stakeFixtureId?: string; extId?: string; marketCount?: number; liveWidgetUrl?: string; widgetUrl?: string; streamExists?: boolean; customBetAvailable?: boolean; data: StakeFixtureData; tournament: StakeTournament; eventStatus?: StakeFixtureEventStatus; }
export interface StakeSportGroup { name: string; translation: string; rank: number; }
export interface StakeSportGroupTemplate { id: string; extId: string; rank: number; name: string; }
export interface StakeMarketOutcome { __typename: "SportMarketOutcome"; id: string; active: boolean; odds: number; name: string; customBetAvailable?: boolean; extId?: string; }
export interface StakeMarket { id: string; name: string; status: "active" | "suspended" | "deactivated" | string; extId: string; specifiers?: string; customBetAvailable?: boolean; provider: string; templateExtId?: string; outcomes: StakeMarketOutcome[]; }
export interface StakeGroupWithMarkets extends StakeSportGroup { templates: Array<StakeSportGroupTemplate & { markets: StakeMarket[] }>; }
export interface SportIndexResponse { slugSport: StakeSport & { templates: StakeSportGroupTemplate[]; firstTournament?: StakeTournament & { fixtureList: Array<StakeFixture & { groups: StakeGroupWithMarkets[] }> }; tournamentList: StakeTournament[]; categoryList: Array<StakeCategory & { tournamentList: StakeTournament[] }>; }; }
export interface FixtureDetailResponse { slugFixture: StakeFixture & { groups: StakeGroupWithMarkets[]; maps?: StakeGroupWithMarkets[]; }; }
export interface PlaceBetParams { amount: number; currency: string; outcomeIds: string[]; oddsChange: "any" | "better" | "none"; identifier?: string; betType: "sports" | "multi"; provider?: string; stakeShieldEnabled?: boolean; stakeShieldProtectionLevel?: number; stakeShieldOfferOdds?: number; promotionId?: string; }
export interface PlacedBetOutcome { id: string; odds: number; }
export interface PlacedBet { id: string; amount: number; currency: string; payoutMultiplier: number; potentialMultiplier: number; outcomes: PlacedBetOutcome[]; customPrices?: Array<{ customOdds: number; type: string; stakeShield?: { offerOdds: number; protectionLevel: number }; promotion?: { id: string; name: string; rule: { boostLadder: Array<{ legs: number; boost: number }> } }; }>; }
export interface PlaceBetResponse { sportBet: PlacedBet; }
export interface BalanceResponse { user: { id: string; balances: { available: Array<{ currency: string; amount: number }>; vault: Array<{ currency: string; amount: number }> }; }; }
export type StakeApiErrorType = "invalidSession" | "insufficientFunds" | "oddsChanged" | "marketSuspended" | "marketDeactivated" | "rateLimited" | "networkError" | "unknown";
export interface StakeApiError { path: string[]; message: string; errorType: StakeApiErrorType; }

FILE: lib/contracts/db.contract.ts
export type BetStatus = "pending" | "won" | "lost" | "cancelled" | "cashout" | "settled";
export type BetType = "single" | "parlay";
export type SlipMode = "singles" | "parlay";
export type OddsFormat = "decimal" | "fractional" | "american";
export type StakingMode = "flat" | "percentage" | "kelly" | "unit";
export interface BetRecord { id: string; amount: number; currency: string; status: BetStatus; betType: BetType; payoutMultiplier: number | null; potentialMultiplier: number; totalOdds: number; stakePerLeg: number | null; createdAt: number; settledAt: number | null; rawData: string; }
export interface BetOutcomeRecord { id: string; betId: string; outcomeId: string; odds: number; name: string; marketName: string; fixtureName: string; fixtureSlug: string; status: BetStatus; result: string | null; }
export interface SavedFilter { id: number; name: string; sport: string | null; group: string | null; tournamentSlugs: string[]; dateFrom: number | null; dateTo: number | null; marketTemplate: string | null; createdAt: number; }
export interface StakingPreset { id: number; name: string; mode: StakingMode; amount: number | null; percentage: number | null; unitSize: number | null; bankroll: number | null; isDefault: boolean; }
export interface AppSetting { key: string; value: string; updatedAt: number; }
export interface AppState { key: string; value: string; updatedAt: number; }

FILE: lib/contracts/ui.contract.ts
import { ReactNode } from "react";
export interface ButtonProps { children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"; size?: "sm" | "md" | "lg"; type?: "button" | "submit" | "reset"; className?: string; icon?: ReactNode; fullWidth?: boolean; }
export interface InputProps { value: string | number; onChange: (value: string) => void; placeholder?: string; type?: "text" | "number" | "password" | "email"; label?: string; error?: string; disabled?: boolean; min?: number; max?: number; step?: number; prefix?: string; suffix?: string; className?: string; }
export interface NumberInputProps extends Omit<InputProps, "onChange" | "type"> { onChange: (value: number) => void; min?: number; max?: number; step?: number; showControls?: boolean; format?: "currency" | "number" | "percentage"; currency?: string; }
export interface SelectOption { value: string; label: string; icon?: ReactNode; disabled?: boolean; }
export interface SelectProps { options: SelectOption[]; value: string; onChange: (value: string) => void; placeholder?: string; label?: string; error?: string; disabled?: boolean; searchable?: boolean; clearable?: boolean; className?: string; }
export interface MultiSelectProps extends Omit<SelectProps, "value" | "onChange"> { value: string[]; onChange: (value: string[]) => void; maxSelected?: number; }
export interface BadgeProps { children: ReactNode; variant?: "default" | "success" | "warning" | "error" | "info" | "neutral"; size?: "sm" | "md"; className?: string; }
export interface CardProps { children: ReactNode; onClick?: () => void; selected?: boolean; disabled?: boolean; className?: string; header?: ReactNode; footer?: ReactNode; padding?: "none" | "sm" | "md" | "lg"; }
export interface ModalProps { open: boolean; onClose: () => void; title?: string; description?: string; children: ReactNode; actions?: ReactNode; size?: "sm" | "md" | "lg" | "xl" | "full"; }
export interface DrawerProps { open: boolean; onClose: () => void; side?: "left" | "right"; children: ReactNode; title?: string; width?: string; }
export interface TabsProps { tabs: Array<{ id: string; label: string; content: ReactNode; badge?: number | string }>; activeTab: string; onChange: (tabId: string) => void; variant?: "underline" | "pills" | "cards"; }
export interface DataTableColumn<T> { key: string; header: string | ReactNode; width?: string; align?: "left" | "center" | "right"; sortable?: boolean; render?: (row: T) => ReactNode; }
export interface DataTableProps<T> { columns: DataTableColumn<T>[]; data: T[]; rowKey: (row: T) => string; selectable?: boolean; selectedRows?: string[]; onRowSelect?: (rowId: string, selected: boolean) => void; onSelectAll?: (selected: boolean) => void; sortColumn?: string; sortDirection?: "asc" | "desc"; onSort?: (column: string) => void; pagination?: { page: number; pageSize: number; total: number; onPageChange: (page: number) => void; onPageSizeChange?: (size: number) => void }; loading?: boolean; emptyState?: ReactNode; onRowClick?: (row: T) => void; }
export interface OddsButtonProps { odds: number; name: string; active: boolean; selected?: boolean; suspended?: boolean; onClick: () => void; trend?: "up" | "down" | "stable"; className?: string; }
export interface FixtureRowProps { fixture: { id: string; name: string; slug: string; startTime: string; status: string; isLive?: boolean; homeScore?: number; awayScore?: number; tournament: { name: string; category: { name: string } }; competitors: Array<{ name: string; iconPath?: string }>; previewMarkets?: Array<{ name: string; outcomes: Array<{ name: string; odds: number; active: boolean }> }> }; selected: boolean; onSelect: (selected: boolean) => void; onViewMarkets: () => void; onAddSelection: (selection: BetSelection) => void; }
export interface BetSelection { id: string; fixtureSlug: string; fixtureName: string; fixtureId: string; tournamentName: string; marketId: string; marketName: string; outcomeId: string; outcomeName: string; odds: number; active: boolean; startTime: string; addedAt: number; }
export interface SlipItemProps { selection: BetSelection; onRemove: () => void; stake?: number; onStakeChange?: (stake: number) => void; mode: SlipMode; result?: { success: boolean; betId?: string; error?: string }; }
export interface BetHistoryRow { id: string; date: string; matches: string[]; market: string; stake: number; totalOdds: number; status: BetStatus; return: number | null; profit: number | null; currency: string; }
export interface StatCardProps { title: string; value: string | number; change?: number; changeLabel?: string; icon?: ReactNode; trend?: "up" | "down" | "neutral"; loading?: boolean; format?: "currency" | "number" | "percentage"; currency?: string; }
export interface ChartDataPoint { label: string; value: number; secondaryValue?: number; date?: string; }
export interface FilterChip { id: string; label: string; onRemove: () => void; }
export interface ToastMessage { id: string; type: "success" | "error" | "warning" | "info"; title: string; description?: string; duration?: number; action?: { label: string; onClick: () => void }; }

FILE: lib/contracts/state.contract.ts
import { BetSelection, SlipMode, BetStatus } from "./ui.contract";
export interface DiscoveryState { sport: string; group: string; dateFrom: number | null; dateTo: number | null; tournamentSlugs: string[]; marketTemplate: string | null; searchQuery: string; isLoading: boolean; error: string | null; fixtures: any[]; }
export interface SlipState { selections: BetSelection[]; mode: SlipMode; stakePerLeg: number; totalStake: number; isPlacing: boolean; placeResults: Array<{ selectionId: string; success: boolean; betId?: string; error?: string; placedAt: number }>; lastError: string | null; }
export interface SettingsState { apiToken: string | null; currency: string; oddsFormat: "decimal" | "fractional" | "american"; defaultPresetId: number | null; notifications: { betPlaced: boolean; betSettled: boolean; oddsChanged: boolean }; theme: "dark" | "light" | "system"; }
export interface UIState { slipOpen: boolean; commandPaletteOpen: boolean; activeModal: string | null; modalData: any; toasts: Array<{ id: string; type: "success" | "error" | "warning" | "info"; title: string; description?: string }>; sidebarCollapsed: boolean; isMobile: boolean; }
export interface AppState { discovery: DiscoveryState; slip: SlipState; settings: SettingsState; ui: UIState; }
export type DiscoveryAction = { type: "SET_SPORT"; payload: string } | { type: "SET_GROUP"; payload: string } | { type: "SET_DATE_RANGE"; payload: { from: number | null; to: number | null } } | { type: "SET_TOURNAMENTS"; payload: string[] } | { type: "SET_MARKET_TEMPLATE"; payload: string | null } | { type: "SET_SEARCH"; payload: string } | { type: "SET_LOADING"; payload: boolean } | { type: "SET_ERROR"; payload: string | null } | { type: "SET_FIXTURES"; payload: any[] } | { type: "CLEAR_FILTERS" };
export type SlipAction = { type: "ADD_SELECTION"; payload: BetSelection } | { type: "REMOVE_SELECTION"; payload: string } | { type: "CLEAR_SELECTIONS" } | { type: "SET_MODE"; payload: SlipMode } | { type: "SET_STAKE_PER_LEG"; payload: number } | { type: "SET_TOTAL_STAKE"; payload: number } | { type: "SET_PLACING"; payload: boolean } | { type: "SET_PLACE_RESULTS"; payload: SlipState["placeResults"] } | { type: "SET_ERROR"; payload: string | null } | { type: "UPDATE_ODDS"; payload: { selectionId: string; odds: number } };
export type SettingsAction = { type: "SET_API_TOKEN"; payload: string | null } | { type: "SET_CURRENCY"; payload: string } | { type: "SET_ODDS_FORMAT"; payload: "decimal" | "fractional" | "american" } | { type: "SET_DEFAULT_PRESET"; payload: number | null } | { type: "SET_NOTIFICATIONS"; payload: Partial<SettingsState["notifications"]> } | { type: "SET_THEME"; payload: "dark" | "light" | "system" };
export type UIAction = { type: "TOGGLE_SLIP"; payload?: boolean } | { type: "TOGGLE_COMMAND_PALETTE"; payload?: boolean } | { type: "OPEN_MODAL"; payload: { modal: string; data?: any } } | { type: "CLOSE_MODAL" } | { type: "ADD_TOAST"; payload: Omit<UIState["toasts"][0], "id"> } | { type: "REMOVE_TOAST"; payload: string } | { type: "TOGGLE_SIDEBAR"; payload?: boolean } | { type: "SET_MOBILE"; payload: boolean };

FILE: lib/utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

───────────────────────────────────────────────────────────────────────────────
SECTION 2: DESIGN SYSTEM COMPONENTS (components/ui/)
───────────────────────────────────────────────────────────────────────────────

Build EVERY component. Each must:

1. Accept props defined in lib/contracts/ui.contract.ts
2. Be fully typed with TypeScript
3. Support dark mode (default)
4. Be responsive
5. Have loading, disabled, and error states
6. Export from components/ui/index.ts

CRITICAL COMPONENTS (build first):

1. Button — All variants, loading spinner, disabled state
2. Input / NumberInput — With increment/decrement, currency formatting
3. Select / MultiSelect — Custom dropdown, searchable, multi-select with chips
4. Badge — All status variants
5. Card — Hover lift, selected state
6. OddsButton — THE MOST IMPORTANT. Shows odds, handles click, selected state, suspended state, trend animation
7. DataTable — Sortable, selectable, pagination, loading skeleton
8. Modal / Drawer — Radix-based, backdrop blur, animations
9. Toast — Sonner integration, auto-dismiss
10. DatePicker / DateRangePicker
11. Skeleton — Pulse animation
12. StatCard — For analytics
13. Sparkline — Mini line chart
14. Confetti — Celebration on win

───────────────────────────────────────────────────────────────────────────────
SECTION 3-12: [All other sections from original prompt]
───────────────────────────────────────────────────────────────────────────────

[See full prompt in saved file for complete sections 3-12 covering:

- Layout Components (AppShell, TopBar, SideNav, BetSlipDrawer, CommandPalette)
- Discovery Components (SearchFilterBar, ResultsTable, MarketBrowser, etc.)
- Slip Components (SlipItem, ModeToggle, StakeInput, PlaceButton, etc.)
- History Components (BetHistoryTable, BetDetailModal, Charts, etc.)
- Analytics Components (KPIOverview, ProfitLossChart, Breakdowns, ExportPanel)
- Settings Components (ApiTokenInput, PresetsManager, FiltersManager, DangerZone)
- Mock Hooks (useStakeApi, useDiscovery, useBetSlip, useBetHistory, etc.)
- Mock Data Generators
- Page Components
- Deliverable Checklist
- Plug-in Interface for Other Segments]

CONSTRAINTS:

- TypeScript: zero `any` types
- Tailwind: no inline styles, no arbitrary values without justification
- Components: max 200 lines per file (split if larger)
- Hooks: max 100 lines per file
- No external UI libraries (Radix primitives OK)
- All text in English
- Currency: NGN default, but support multiple
- Odds: Decimal default, but support fractional/american display
- Dark mode only (no light mode needed for v1)
- Mobile-first responsive

═══════════════════════════════════════════════════════════════════════════════
END OF SEGMENT 1 PROMPT
═══════════════════════════════════════════════════════════════════════════════
