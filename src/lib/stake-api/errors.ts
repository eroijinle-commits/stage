/**
 * Stake API error classification and user-friendly messages.
 * @module lib/stake-api/errors
 */

import { StakeApiError, type StakeApiErrorType } from "./types";

/**
 * Classify an unknown error into a known StakeApiErrorType.
 */
export function classifyError(error: unknown): StakeApiErrorType {
    if (error instanceof StakeApiError) return error.type;

    if (!(error instanceof Error)) return "unknown";

    const msg = error.message.toLowerCase();

    // Network-level errors
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("econnrefused") || msg.includes("econnreset")) {
        return "networkError";
    }

    // HTTP status mapping
    if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid session")) {
        return "invalidSession";
    }
    if (msg.includes("429") || msg.includes("rate limit")) {
        return "rateLimited";
    }
    if (msg.includes("insufficient") || msg.includes("402") || msg.includes("balance")) {
        return "insufficientFunds";
    }

    // Stake-specific GraphQL error messages
    if (msg.includes("odds have changed") || msg.includes("odds changed") || msg.includes("price changed")) {
        return "oddsChanged";
    }
    if (msg.includes("market suspended") || msg.includes("temporarily unavailable")) {
        return "marketSuspended";
    }
    if (msg.includes("market deactivated") || msg.includes("no longer available")) {
        return "marketDeactivated";
    }

    return "unknown";
}

/**
 * Map an error type to a human-readable message.
 */
export function getUserFriendlyMessage(errorType: StakeApiErrorType): string {
    const messages: Record<StakeApiErrorType, string> = {
        invalidSession: "Your session has expired. Please re-enter your API token in Settings.",
        insufficientFunds: "Insufficient balance to place this bet. Top up your account and try again.",
        oddsChanged: "The odds have changed since you added this selection. Please review and retry.",
        marketSuspended: "This market is temporarily suspended. Try again shortly.",
        marketDeactivated: "This market is no longer available.",
        rateLimited: "Too many requests. Please wait a moment and try again.",
        networkError: "Network error — check your connection and try again.",
        unknown: "An unexpected error occurred. Please try again.",
    };
    return messages[errorType];
}
