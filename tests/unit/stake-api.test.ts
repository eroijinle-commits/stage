/**
 * Unit tests for the Stake API client, auth, and rate limiter.
 * @module tests/unit/stake-api
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    executeQuery,
    setToken,
    testConnectionQuery,
} from "@/lib/stake-api/client";
import { isValidTokenFormat, saveToken, getStoredToken } from "@/lib/stake-api/auth";
import { computeBackoff, resetRateLimiter, rateLimited } from "@/lib/stake-api/rate-limiter";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { StakeApiError } from "@/lib/stake-api/types";
import {
    graphqlSuccess,
    graphqlError,
    httpError,
    mockBalanceResponse,
    mockPlaceBetErrorResponse,
} from "../fixtures/mock-stake-responses";

// ─── Token Management ──────────────────────────────────────────────────────

describe("Token management", () => {
    it("setToken stores token in localStorage", () => {
        setToken("test-token-abc123");
        expect(localStorage.getItem("stake-api-token")).toBe("test-token-abc123");
    });

    it("setToken(null) removes token from localStorage", () => {
        localStorage.setItem("stake-api-token", "existing");
        setToken(null);
        expect(localStorage.getItem("stake-api-token")).toBeNull();
    });

    it("isValidTokenFormat accepts valid tokens", () => {
        expect(isValidTokenFormat("abcdefghijklmnopqrst")).toBe(true);
        expect(isValidTokenFormat("abc-def_ghi-jkl_mno-pqr")).toBe(true);
        expect(isValidTokenFormat("a".repeat(50))).toBe(true);
    });

    it("isValidTokenFormat rejects short tokens", () => {
        expect(isValidTokenFormat("short")).toBe(false);
        expect(isValidTokenFormat("a".repeat(19))).toBe(false);
    });

    it("isValidTokenFormat rejects tokens with invalid chars", () => {
        expect(isValidTokenFormat("token with spaces")).toBe(false);
        expect(isValidTokenFormat("token@special!chars")).toBe(false);
    });

    it("saveToken and getStoredToken round-trip", () => {
        saveToken("my-token-value");
        expect(getStoredToken()).toBe("my-token-value");
    });

    it("getStoredToken returns null when no token stored", () => {
        expect(getStoredToken()).toBeNull();
    });
});

// ─── executeQuery ───────────────────────────────────────────────────────────

describe("executeQuery", () => {
    beforeEach(() => {
        resetRateLimiter();
        vi.restoreAllMocks();
    });

    it("parses successful GraphQL response", async () => {
        const mockData = { user: { balances: [{ currency: "NGN", available: "50000" }] } };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess(mockData)));

        const result = await executeQuery({
            query: "query { user { balances { currency available } } }",
            operationName: "TestQuery",
            operationType: "query",
        });

        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("includes auth header when token is set", async () => {
        setToken("test-api-token-123");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess({ ok: true })));

        await executeQuery({
            query: "query { test }",
            operationName: "TestQuery",
            operationType: "query",
        });

        const callArgs = vi.mocked(fetch).mock.calls[0];
        const headers = callArgs[1]?.headers as Record<string, string>;
        expect(headers["x-access-token"]).toBe("test-api-token-123");
    });

    it("does not include auth header when no token", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess({ ok: true })));

        await executeQuery({
            query: "query { test }",
            operationName: "TestQuery",
            operationType: "query",
        });

        const callArgs = vi.mocked(fetch).mock.calls[0];
        const headers = callArgs[1]?.headers as Record<string, string>;
        expect(headers["x-access-token"]).toBeUndefined();
    });

    it("throws StakeApiError on GraphQL errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlError("Invalid query")));

        await expect(
            executeQuery({
                query: "query { bad }",
                operationName: "TestQuery",
                operationType: "query",
            }),
        ).rejects.toThrow();
    });

    it("retries on network error (1 retry)", async () => {
        const mockFetch = vi
            .fn()
            .mockRejectedValueOnce(new TypeError("Failed to fetch"))
            .mockResolvedValueOnce(graphqlSuccess({ data: true }));

        vi.stubGlobal("fetch", mockFetch);

        const result = await executeQuery({
            query: "query { test }",
            operationName: "TestQuery",
            operationType: "query",
        });

        expect(result).toEqual({ data: true });
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws after exhausting retries on network error", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await expect(
            executeQuery({
                query: "query { test }",
                operationName: "TestQuery",
                operationType: "query",
            }),
        ).rejects.toThrow();
    });

    it("retries on 5xx HTTP errors", async () => {
        const mockFetch = vi
            .fn()
            .mockResolvedValueOnce(httpError(502, "Bad Gateway"))
            .mockResolvedValueOnce(graphqlSuccess({ recovered: true }));

        vi.stubGlobal("fetch", mockFetch);

        const result = await executeQuery({
            query: "query { test }",
            operationName: "TestQuery",
            operationType: "query",
        });

        expect(result).toEqual({ recovered: true });
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("does not retry on 4xx errors", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(httpError(400, "Bad Request")));

        await expect(
            executeQuery({
                query: "query { test }",
                operationName: "TestQuery",
                operationType: "query",
            }),
        ).rejects.toThrow();

        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("handles empty data response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess(undefined)));

        await expect(
            executeQuery({
                query: "query { test }",
                operationName: "TestQuery",
                operationType: "query",
            }),
        ).rejects.toThrow();
    });

    it("sends correct request body", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess({ ok: true })));

        const query = "query Test($id: String!) { item(id: $id) { name } }";
        const variables = { id: "123" };

        await executeQuery({
            query,
            variables,
            operationName: "TestQuery",
            operationType: "query",
        });

        const callArgs = vi.mocked(fetch).mock.calls[0];
        const body = JSON.parse(callArgs[1]?.body as string);
        expect(body.query).toBe(query);
        expect(body.variables).toEqual(variables);
    });

    it("sets operation headers correctly", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlSuccess({ ok: true })));

        await executeQuery({
            query: "query { test }",
            operationName: "SportIndex",
            operationType: "mutation",
        });

        const callArgs = vi.mocked(fetch).mock.calls[0];
        const headers = callArgs[1]?.headers as Record<string, string>;
        expect(headers["x-operation-name"]).toBe("SportIndex");
        expect(headers["x-operation-type"]).toBe("mutation");
        expect(headers["x-language"]).toBe("en");
        expect(headers["Content-Type"]).toBe("application/json");
    });
});

// ─── testConnectionQuery ────────────────────────────────────────────────────

describe("testConnectionQuery", () => {
    beforeEach(() => {
        resetRateLimiter();
        vi.restoreAllMocks();
    });

    it("returns false when no token is set", async () => {
        const result = await testConnectionQuery();
        expect(result).toBe(false);
    });

    it("returns true when API responds with valid data", async () => {
        setToken("valid-token");
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                graphqlSuccess({ user: { balances: [{ currency: "NGN" }] } }),
            ),
        );

        const result = await testConnectionQuery();
        expect(result).toBe(true);
    });

    it("returns false when API returns errors", async () => {
        setToken("invalid-token");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(graphqlError("Unauthorized")));

        const result = await testConnectionQuery();
        expect(result).toBe(false);
    });

    it("returns false on network error", async () => {
        setToken("token");
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        const result = await testConnectionQuery();
        expect(result).toBe(false);
    });
});

// ─── Rate Limiter ───────────────────────────────────────────────────────────

describe("Rate Limiter", () => {
    beforeEach(() => {
        resetRateLimiter();
    });

    it("computeBackoff returns 1000ms for first retry", () => {
        expect(computeBackoff(0)).toBe(1000);
    });

    it("computeBackoff doubles delay for subsequent retries", () => {
        expect(computeBackoff(0)).toBe(1000);
        expect(computeBackoff(1)).toBe(2000);
        expect(computeBackoff(2)).toBe(4000);
    });

    it("computeBackoff caps at MAX_DELAY_MS (30s)", () => {
        expect(computeBackoff(10)).toBe(30000);
        expect(computeBackoff(20)).toBe(30000);
    });

    it("computeBackoff uses Retry-After header when provided", () => {
        expect(computeBackoff(0, 5)).toBe(5000);
        expect(computeBackoff(0, 60)).toBe(30000); // capped
    });

    it("rateLimited executes functions concurrently up to limit", async () => {
        const results: number[] = [];
        const fns = Array.from({ length: 3 }, (_, i) =>
            rateLimited(async () => {
                results.push(i);
                return i;
            }),
        );

        await Promise.all(fns);
        expect(results).toHaveLength(3);
    });

    it("rateLimited queues excess requests", async () => {
        // Queue 6 requests — should run 5 concurrently, queue 1
        const order: number[] = [];
        const fns = Array.from({ length: 6 }, (_, i) =>
            rateLimited(async () => {
                order.push(i);
                return i;
            }),
        );

        await Promise.all(fns);
        expect(order).toHaveLength(6);
    });
});

// ─── Error Classification ───────────────────────────────────────────────────

describe("Error classification", () => {
    it("classifies network errors", () => {
        expect(classifyError(new TypeError("Failed to fetch"))).toBe("networkError");
        expect(classifyError(new Error("ECONNREFUSED"))).toBe("networkError");
    });

    it("classifies auth errors", () => {
        expect(classifyError(new Error("HTTP 401: Unauthorized"))).toBe("invalidSession");
        expect(classifyError(new Error("Invalid session"))).toBe("invalidSession");
    });

    it("classifies rate limit errors", () => {
        expect(classifyError(new Error("HTTP 429: Too Many Requests"))).toBe("rateLimited");
        expect(classifyError(new Error("rate limit exceeded"))).toBe("rateLimited");
    });

    it("classifies odds changed errors", () => {
        expect(classifyError(new Error("odds have changed"))).toBe("oddsChanged");
        expect(classifyError(new Error("price changed"))).toBe("oddsChanged");
    });

    it("classifies duplicate fixture errors", () => {
        expect(classifyError(new Error("Multi bet cannot contain multiple markets from same event"))).toBe("duplicateFixtures");
        expect(classifyError(new Error("duplicateFixtures"))).toBe("duplicateFixtures");
    });

    it("classifies market suspended errors", () => {
        expect(classifyError(new Error("market suspended"))).toBe("marketSuspended");
        expect(classifyError(new Error("temporarily unavailable"))).toBe("marketSuspended");
    });

    it("classifies StakeApiError directly", () => {
        const err = new StakeApiError("insufficientFunds", "Not enough");
        expect(classifyError(err)).toBe("insufficientFunds");
    });

    it("returns unknown for non-Error values", () => {
        expect(classifyError("string error")).toBe("unknown");
        expect(classifyError(null)).toBe("unknown");
        expect(classifyError(42)).toBe("unknown");
    });

    it("returns user-friendly messages for all error types", () => {
        const types = [
            "invalidSession",
            "insufficientFunds",
            "oddsChanged",
            "marketSuspended",
            "marketDeactivated",
            "rateLimited",
            "networkError",
            "unknown",
        ] as const;

        for (const type of types) {
            const msg = getUserFriendlyMessage(type);
            expect(typeof msg).toBe("string");
            expect(msg.length).toBeGreaterThan(0);
        }
    });
});
