/**
 * Barrel export for the Stake API layer.
 * @module lib/stake-api
 */

// Client
export { executeQuery, setToken, testConnectionQuery } from "./client";

// Auth
export { isValidTokenFormat, getBalance, testConnection, saveToken, getStoredToken } from "./auth";

// Queries
export {
    getBalanceQuery,
    getSportIndex,
    getFixtureDetailsQuery,
    getBetHistoryQuery,
    getActiveBetCountQuery,
} from "./queries";

// Mutations
export { placeBetMutation } from "./mutations";

// Errors
export { classifyError, getUserFriendlyMessage } from "./errors";

// Rate limiter
export { rateLimited, computeBackoff, sleep, resetRateLimiter } from "./rate-limiter";

// Types from ./types
export {
    StakeApiError,
    type StakeApiErrorType,
    type GraphQLResponse,
    type BalanceResponse,
    type CurrencyBalance,
    type BetHistoryEntry,
    type PlaceBetParams,
    type PlaceResult,
    type PlacedBetOutcome,
    type OperationType,
    type ExecuteQueryOptions,
} from "./types";

// Types from ./queries
export type {
    SportIndexData,
    FixtureDetailsData,
    BetHistoryData,
    ActiveBetCountData,
} from "./queries";
