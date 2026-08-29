import { ReactNode } from "react";
import { BetStatus, SlipMode } from "./db.contract";

export interface ButtonProps { children: ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "secondary" | "danger" | "ghost" | "outline"; size?: "sm" | "md" | "lg"; type?: "button" | "submit" | "reset"; className?: string; icon?: ReactNode; fullWidth?: boolean; }
export interface InputProps { value: string | number; onChange: (value: string) => void; placeholder?: string; type?: "text" | "number" | "password" | "email"; label?: string; error?: string; disabled?: boolean; min?: number; max?: number; step?: number; prefix?: ReactNode; suffix?: ReactNode; className?: string; }
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

// ─── Bet Type System ───

export interface BetTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  templates: string[];
  lines?: string[];
  hasLines: boolean;
  popular: boolean;
  sports?: string[]; // e.g. ["soccer"], ["tennis"], or omit for all sports
}

export interface BetTypeLineConfig {
  line: string;
  overOdds?: number;
  underOdds?: number;
  label: string;
}

export interface DiscoveryFilters {
  sport: string;
  betType: string | null;
  betTypeLine: string | null;
  group: string;
  dateFrom: number | null;
  dateTo: number | null;
  tournamentSlugs: string[];
  searchQuery: string;
}

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
  betType: string;
  betTypeLine: string | null;
  sport?: string;
}

export interface SlipItemProps { selection: BetSelection; onRemove: () => void; stake?: number; onStakeChange?: (stake: number) => void; mode: SlipMode; result?: { success: boolean; betId?: string; error?: string }; }

export interface BetHistoryRow { id: string; date: string; matches: string[]; market: string; stake: number; totalOdds: number; status: BetStatus; return: number | null; profit: number | null; currency: string; }

export interface StatCardProps { title: string; value: string | number; change?: number; changeLabel?: string; icon?: ReactNode; trend?: "up" | "down" | "neutral"; loading?: boolean; format?: "currency" | "number" | "percentage"; currency?: string; }
export interface ChartDataPoint { label: string; value: number; secondaryValue?: number; date?: string; }
export interface FilterChip { id: string; label: string; onRemove: () => void; }
export interface ToastMessage { id: string; type: "success" | "error" | "warning" | "info"; title: string; description?: string; duration?: number; action?: { label: string; onClick: () => void }; }

export interface BetTypeInfo {
  betTypeName: string;
  line: string | null;
  overOutcome?: { name: string; odds: number; active: boolean; id: string };
  underOutcome?: { name: string; odds: number; active: boolean; id: string };
  singleOutcome?: { name: string; odds: number; active: boolean; id: string };
  allOutcomes?: Array<{ name: string; odds: number; active: boolean; id: string }>;
  available: boolean;
}

export interface DiscoveryFixture {
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
  previewMarkets?: Array<{ name: string; outcomes: Array<{ name: string; odds: number; active: boolean }> }>;
  betTypeInfo?: BetTypeInfo;
  sport?: string;
}

export interface FixtureRowProps {
  fixture: DiscoveryFixture;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onViewMarkets: () => void;
  onAddSelection: (selection: BetSelection) => void;
  activeBetType?: BetTypeConfig | null;
}

// ─── Analytics Types (Segment 3 + 6) ───

export interface KPIOverview {
  totalBets: number;
  totalWagered: number;
  totalReturned: number;
  netProfit: number;
  winRate: number;
  avgOdds: number;
  avgStake: number;
  roi: number;
  yield: number;
}

export interface SportBreakdown {
  sport: string;
  bets: number;
  wins: number;
  winRate: number;
  profit: number;
}

export interface MarketBreakdown {
  market: string;
  bets: number;
  wins: number;
  winRate: number;
  profit: number;
  roi: number;
}

export interface MonthlyTrend {
  month: string;
  bets: number;
  wins: number;
  profit: number;
  avgOdds: number;
  winRate: number;
}

export interface TimeOfDayData {
  hour: number;
  bets: number;
  winRate: number;
  profit: number;
}

export interface LeaguePerformance {
  league: string;
  bets: number;
  wins: number;
  winRate: number;
  profit: number;
  roi: number;
  avgOdds: number;
}

export interface StakingPerformance {
  preset: string;
  bets: number;
  wins: number;
  profit: number;
  roi: number;
}

export interface OddsPerformance {
  range: string;
  bets: number;
  wins: number;
  winRate: number;
  profit: number;
  expectedValue: number;
}

export interface ExportOptions {
  dateFrom?: Date;
  dateTo?: Date;
  fields?: string[];
  currency?: string;
}
