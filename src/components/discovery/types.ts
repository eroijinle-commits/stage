/**
 * Discovery-engine types — used by discovery components and hooks.
 * @module components/discovery/types
 */

import { StakeGroupWithMarkets } from "@/lib/contracts/api.contract";

// ─── Date Range Presets ────────────────────────────────────────────────────

export type DatePreset = "today" | "tomorrow" | "weekend" | "next7" | "next30" | "custom";

export interface DateRangeOption {
    id: DatePreset;
    label: string;
}

export const DATE_PRESETS: DateRangeOption[] = [
    { id: "today", label: "Today" },
    { id: "tomorrow", label: "Tomorrow" },
    { id: "weekend", label: "This Weekend" },
    { id: "next7", label: "Next 7 Days" },
    { id: "next30", label: "Next 30 Days" },
    { id: "custom", label: "Custom" },
];

// ─── Market Group ──────────────────────────────────────────────────────────

export type MarketGroupFilter = "all" | "main" | "corners" | "cards" | "goals" | "handicap";

export interface MarketGroupOption {
    id: MarketGroupFilter;
    label: string;
}

export const MARKET_GROUP_OPTIONS: MarketGroupOption[] = [
    { id: "all", label: "All Markets" },
    { id: "main", label: "Main" },
    { id: "corners", label: "Corners" },
    { id: "cards", label: "Cards" },
    { id: "goals", label: "Goals" },
    { id: "handicap", label: "Handicap" },
];

// ─── Fixture Detail (loaded on demand) ─────────────────────────────────────

export interface FixtureMarketGroup extends StakeGroupWithMarkets { }

export interface FixtureDetailState {
    fixtureSlug: string | null;
    isLoading: boolean;
    error: string | null;
    marketGroups: StakeGroupWithMarkets[];
}

// ─── Odds History for Trend ────────────────────────────────────────────────

export interface OddsHistoryPoint {
    odds: number;
    timestamp: number;
}

// ─── Bulk Apply Confirmation ───────────────────────────────────────────────

export interface BulkApplyConfirm {
    marketName: string;
    fixtureCount: number;
    fixtureNames: string[];
}

// ─── Pagination ────────────────────────────────────────────────────────────

export const PAGE_SIZE = 50;

export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}
