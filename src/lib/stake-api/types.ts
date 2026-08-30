/**
 * Stake API types — re-exports contract types plus internal API-specific types.
 * @module lib/stake-api/types
 */

// Re-export all public contract types
export type {
    StakeSport,
    StakeCategory,
    StakeTournament,
    StakeFixtureCompetitor,
    StakeFixtureDataMatch,
    StakeFixtureDataOutright,
    StakeFixtureData,
    StakeFixtureEventStatus,
    StakeFixture,
    StakeSportGroup,
    StakeSportGroupTemplate,
    StakeMarketOutcome,
    StakeMarket,
    StakeGroupWithMarkets,
} from "@/lib/contracts/api.contract";

// ─── GraphQL Error ──────────────────────────────────────────────────────────

export interface GraphQLErrorLocation {
    line: number;
    column: number;
}

export interface GraphQLError {
    message: string;
    locations?: GraphQLErrorLocation[];
    path?: Array<string | number>;
    extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
    data?: T;
    errors?: GraphQLError[];
}

// ─── Stake API Error ────────────────────────────────────────────────────────

export type StakeApiErrorType =
    | "invalidSession"
    | "insufficientFunds"
    | "oddsChanged"
    | "marketSuspended"
    | "marketDeactivated"
    | "rateLimited"
    | "networkError"
    | "unknown";

export class StakeApiError extends Error {
    readonly type: StakeApiErrorType;
    readonly statusCode?: number;
    readonly raw?: unknown;

    constructor(type: StakeApiErrorType, message: string, statusCode?: number, raw?: unknown) {
        super(message);
        this.name = "StakeApiError";
        this.type = type;
        this.statusCode = statusCode;
        this.raw = raw;
    }
}

// ─── Balance ────────────────────────────────────────────────────────────────

export interface CurrencyBalance {
    currency: string;
    available: string;
    vault: string;
    activeBonus: string;
}

export interface BalanceResponse {
    balances: CurrencyBalance[];
}

// ─── Sport Index ────────────────────────────────────────────────────────────

export interface SportIndexResponse {
    sport: {
        id: string;
        name: string;
        slug: string;
        categories: Array<{
            id: string;
            name: string;
            slug: string;
            sport: { id: string; name: string; slug: string };
            tournaments: Array<{
                id: string;
                name: string;
                slug: string;
                category: { id: string; name: string; slug: string; sport: { id: string; name: string; slug: string } };
                fixtures: Array<{
                    id: string;
                    name: string;
                    slug: string;
                    status: string;
                    provider: string;
                    stakeFixtureId?: string;
                    extId?: string;
                    marketCount?: number;
                    liveWidgetUrl?: string;
                    widgetUrl?: string;
                    streamExists?: boolean;
                    customBetAvailable?: boolean;
                    data: import("@/lib/contracts/api.contract").StakeFixtureData;
                    eventStatus?: import("@/lib/contracts/api.contract").StakeFixtureEventStatus;
                }>;
            }>;
        }>;
    };
}

// ─── Fixture Details ────────────────────────────────────────────────────────

export interface FixtureDetailsResponse {
    fixturePage: {
        fixture: import("@/lib/contracts/api.contract").StakeFixture;
        marketGroups: import("@/lib/contracts/api.contract").StakeGroupWithMarkets[];
    };
}

// ─── Fixture Groups ─────────────────────────────────────────────────────────

export interface FixtureGroupsResponse {
    fixtureIndex: {
        groups: Array<{ name: string; translation: string; rank: number }>;
    };
}

// ─── Bet History ────────────────────────────────────────────────────────────

export interface BetHistoryEntry {
    id: string;
    amount: number;
    currency: string;
    status: string;
    betType: string;
    payoutMultiplier: number | null;
    potentialMultiplier: number;
    totalOdds: number;
    stakePerLeg: number | null;
    createdAt: number;
    settledAt: number | null;
    outcomes: Array<{
        id: string;
        name: string;
        odds: number;
        market: { name: string };
        fixture: { name: string; slug: string };
        result: string | null;
        status: string;
    }>;
}

export interface BetHistoryResponse {
    sportList: {
        bets: BetHistoryEntry[];
        totalCount: number;
    };
}

// ─── Active Bet Count ───────────────────────────────────────────────────────

export interface ActiveBetCountResponse {
    activeBets: {
        count: number;
        byType: Record<string, number>;
    };
}

// ─── Place Bet ──────────────────────────────────────────────────────────────

export interface PlaceBetParams {
    outcomeIds: string[];
    amounts: number[];
    currency: string;
    odds: number[];
    betType: "sports" | "multi";
    stakeShieldEnabled?: boolean;
}

export interface PlacedBetOutcome {
    id: string;
    odds: number;
    market: { name: string };
    fixtureName: string;
}

export interface PlaceResult {
    id: string;
    amount: number;
    currency: string;
    potentialMultiplier: number;
    outcomes: PlacedBetOutcome[];
    status: string;
    createdAt: number;
    customPrices?: Array<{
        customOdds: number;
        type: string;
        stakeShield?: { offerOdds: number; protectionLevel: number };
    }>;
}

export interface PlaceBetResponse {
    placeBet: PlaceResult;
}

// ─── Internal Client Types ──────────────────────────────────────────────────

export type OperationType = "query" | "mutation";

export interface ExecuteQueryOptions {
    query: string;
    variables?: Record<string, unknown>;
    operationName: string;
    operationType: OperationType;
}
