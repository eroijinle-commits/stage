/**
 * Authentication helpers for the Stake API.
 * Token is stored in localStorage and never logged.
 * @module lib/stake-api/auth
 */

import { executeQuery, setToken, testConnectionQuery } from "./client";
import type { BalanceResponse } from "./types";

const TOKEN_REGEX = /^[a-zA-Z0-9\-_]{20,}$/;

/**
 * Validate token format (client-side only, no API call).
 * Accepts alphanumeric strings, hyphens, and underscores with min length 20.
 */
export function isValidTokenFormat(token: string): boolean {
    return TOKEN_REGEX.test(token);
}

/**
 * Get user balances by currency.
 *
 * @param available - If true, only return available (non-vault) balances
 * @param vault - If true, include vault balances
 * @returns Balance data by currency
 */
export async function getBalance(available = true, vault = false): Promise<BalanceResponse> {
    const query = `
    query StakeBalances {
      user {
        balances {
          currency
          available
          vault
          activeBonus
        }
      }
    }
  `;

    const data = await executeQuery<{ user: { balances: BalanceResponse["balances"] } }>({
        query,
        operationName: "StakeBalances",
        operationType: "query",
    });

    let balances = data.user.balances;

    if (available) {
        balances = balances.map((b) => ({
            ...b,
            vault: vault ? b.vault : "0",
        }));
    }

    return { balances };
}

/**
 * Test the API connection by fetching balances.
 * Returns true if the API is reachable and the token is valid.
 */
export async function testConnection(): Promise<boolean> {
    return testConnectionQuery();
}

/**
 * Store the API token securely in localStorage.
 */
export function saveToken(token: string | null): void {
    setToken(token);
}

/**
 * Retrieve the stored API token.
 */
export function getStoredToken(): string | null {
    try {
        return localStorage.getItem("stake-api-token");
    } catch {
        return null;
    }
}
