/**
 * Typed GraphQL fetch wrapper for Stake.com API.
 * Posts to https://stake.com/_api/graphql with proper headers.
 * Includes retry logic (1 retry with exponential backoff) for network errors
 * and rate limiting via the rate-limiter module.
 * @module lib/stake-api/client
 */

import { rateLimited, computeBackoff, sleep } from "./rate-limiter";
import { classifyError, getUserFriendlyMessage } from "./errors";
import { StakeApiError, type GraphQLResponse, type ExecuteQueryOptions } from "./types";

const GRAPHQL_ENDPOINT = "https://stake.com/_api/graphql";
const MAX_RETRIES = 1;

/**
 * Get the API token from localStorage (set via Settings page).
 * NEVER logs the token.
 */
function getToken(): string | null {
    try {
        return localStorage.getItem("stake-api-token");
    } catch {
        return null;
    }
}

/**
 * Set the API token in localStorage.
 */
export function setToken(token: string | null): void {
    try {
        if (token) {
            localStorage.setItem("stake-api-token", token);
        } else {
            localStorage.removeItem("stake-api-token");
        }
    } catch {
        // localStorage unavailable — silently fail
    }
}

/**
 * Execute a GraphQL query/mutation against the Stake API.
 * Handles network errors, JSON parse errors, GraphQL errors, and retries.
 *
 * @param options.query - The GraphQL query string
 * @param options.variables - Query/mutation variables
 * @param options.operationName - Name of the operation (for header)
 * @param options.operationType - "query" or "mutation"
 * @returns The typed data response
 * @throws StakeApiError on any failure
 */
export async function executeQuery<T>(options: ExecuteQueryOptions): Promise<T> {
    const { query, variables, operationName, operationType } = options;

    return rateLimited(async () => {
        let lastError: unknown;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                const delay = computeBackoff(attempt - 1);
                await sleep(delay);
            }

            try {
                const token = getToken();
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                    "x-language": "en",
                    "x-operation-name": operationName,
                    "x-operation-type": operationType,
                };

                if (token) {
                    headers["x-access-token"] = token;
                }

                const response = await fetch(GRAPHQL_ENDPOINT, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ query, variables }),
                });

                // Handle 429 rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get("Retry-After");
                    const delay = computeBackoff(attempt, retryAfter ? parseInt(retryAfter, 10) : undefined);
                    await sleep(delay);
                    lastError = new StakeApiError("rateLimited", "Rate limited by server", 429);
                    continue;
                }

                // Handle non-OK responses
                if (!response.ok) {
                    const statusText = response.statusText;
                    lastError = new Error(`HTTP ${response.status}: ${statusText}`);
                    // Retry on 5xx
                    if (response.status >= 500 && attempt < MAX_RETRIES) continue;
                    break;
                }

                // Parse JSON
                let body: unknown;
                try {
                    body = await response.json();
                } catch {
                    lastError = new Error("Failed to parse API response as JSON");
                    continue;
                }

                const graphql = body as GraphQLResponse<T>;

                // Check for GraphQL errors
                if (graphql.errors && graphql.errors.length > 0) {
                    const firstErr = graphql.errors[0];

                    // Partial data: some sub-fields (e.g. markets) may be geo-restricted
                    // but the rest of the query data is still valid — return it
                    if (graphql.data) {
                        console.warn(
                            "[stake-api] Partial GraphQL error (returning available data):",
                            firstErr.message,
                            firstErr.path,
                        );
                        return graphql.data;
                    }

                    lastError = new Error(firstErr.message);
                    // Don't retry on GraphQL errors — they're deterministic
                    break;
                }

                if (!graphql.data) {
                    lastError = new Error("API returned empty data");
                    break;
                }

                return graphql.data;
            } catch (err) {
                // Network errors — retry
                lastError = err;
                if (attempt < MAX_RETRIES) continue;
            }
        }

        // All retries exhausted — classify and throw
        if (lastError instanceof StakeApiError) throw lastError;

        const errorType = classifyError(lastError);
        throw new StakeApiError(
            errorType,
            getUserFriendlyMessage(errorType),
            undefined,
            lastError,
        );
    }) as Promise<T>;
}

/**
 * Test the API connection by executing a lightweight query.
 * Returns true if connection is valid, false otherwise.
 */
export async function testConnectionQuery(): Promise<boolean> {
    try {
        const token = getToken();
        if (!token) return false;

        const response = await fetch(GRAPHQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-access-token": token,
                "x-language": "en",
                "x-operation-name": "StakeBalances",
                "x-operation-type": "query",
            },
            body: JSON.stringify({
                query: `query StakeBalances { user { balances { available { amount currency } vault { amount currency } } } }`,
            }),
        });

        if (!response.ok) return false;

        const body = await response.json() as GraphQLResponse<{ user: { balances: unknown[] } }>;
        return !body.errors && !!body.data?.user;
    } catch {
        return false;
    }
}
