/**
 * Unit tests for useCompute hook and computeSlipToBetSelections helper.
 * Tests state transitions, config changes, error handling, loading states,
 * null fixture, empty results, and API failure.
 * @module tests/unit/useCompute
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCompute, computeSlipToBetSelections } from "@/hooks/useCompute";
import { useSlipStore } from "@/store/useSlipStore";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import type { ComputeSlip, ComputeSelection, RankedGroup } from "@/lib/compute/types";
import { MAX_PERMUTATIONS } from "@/lib/compute/types";
import type { StakeGroupWithMarkets } from "@/lib/contracts/api.contract";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/stake-api/queries", () => ({
    getFixtureDetailsQuery: vi.fn(),
}));

import { getFixtureDetailsQuery } from "@/lib/stake-api/queries";
const mockGetFixtureDetails = vi.mocked(getFixtureDetailsQuery);

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeFixture(overrides: Partial<DiscoveryFixture> = {}): DiscoveryFixture {
    return {
        id: "f1",
        name: "Arsenal vs Chelsea",
        slug: "arsenal-vs-chelsea",
        startTime: "2026-08-30T15:00:00Z",
        status: "not_started",
        tournament: {
            name: "Premier League",
            slug: "premier-league",
            category: { name: "England", slug: "england" },
        },
        competitors: [
            { name: "Arsenal" },
            { name: "Chelsea" },
        ],
        sport: "soccer",
        stakeUrl: "https://stake.com/sports/soccer/arsenal-vs-chelsea",
        ...overrides,
    };
}

function makeOutcome(id: string, odds: number, active = true) {
    return {
        __typename: "SportMarketOutcome" as const,
        id,
        active,
        odds,
        name: `Outcome ${id}`,
    };
}

function makeRankedMarket(id: string, name: string, oddsList: number[], groupName = "main") {
    const outcomes = oddsList.map((odds, i) => makeOutcome(`${id}-o${i}`, odds));
    return {
        market: {
            id,
            name,
            status: "active" as const,
            extId: `ext-${id}`,
            provider: "test",
            outcomes,
        },
        groupName,
        avgOdds: oddsList.reduce((s, o) => s + o, 0) / oddsList.length,
        outcomeCount: oddsList.length,
    };
}

function makeRankedGroup(
    name: string,
    marketConfigs: Array<{ id: string; name: string; odds: number[] }>,
    translation?: string,
): RankedGroup {
    return {
        groupName: name,
        groupTranslation: translation ?? name,
        markets: marketConfigs.map((m) => makeRankedMarket(m.id, m.name, m.odds, name)),
    };
}

function makeApiMarketGroup(
    name: string,
    translation: string,
    marketConfigs: Array<{ id: string; name: string; odds: number[] }>,
): StakeGroupWithMarkets {
    return {
        name,
        translation,
        rank: 1,
        templates: [
            {
                id: "t1",
                extId: "ext-t1",
                rank: 1,
                name: "Template 1",
                markets: marketConfigs.map((m) => ({
                    id: m.id,
                    name: m.name,
                    status: "active",
                    extId: `ext-${m.id}`,
                    provider: "test",
                    outcomes: m.odds.map((odds, i) => makeOutcome(`${m.id}-o${i}`, odds)),
                })),
            },
        ],
    };
}

function makeComputeSlip(
    id: string,
    selections: ComputeSelection[],
    combinedOdds?: number,
): ComputeSlip {
    const odds = combinedOdds ?? selections.reduce((acc, s) => acc * s.odds, 1);
    return { id, selections, totalCombinedOdds: odds };
}

function makeComputeSelection(overrides: Partial<ComputeSelection> = {}): ComputeSelection {
    return {
        marketId: "m1",
        marketName: "Match Winner",
        outcomeId: "m1-o0",
        outcomeName: "Home",
        odds: 2.0,
        groupName: "main",
        ...overrides,
    };
}

// ─── Reset store between tests ───────────────────────────────────────────────

beforeEach(() => {
    useSlipStore.setState({
        selections: [],
        mode: "singles",
        stakePerLeg: 1000,
        placeResults: [],
        lastError: null,
    });
    mockGetFixtureDetails.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
// computeSlipToBetSelections — pure conversion function
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeSlipToBetSelections", () => {
    const fixture = makeFixture();
    const selection = makeComputeSelection();
    const slip = makeComputeSlip("slip-0-0", [selection]);

    it("converts a single selection slip to BetSelection array", () => {
        const result = computeSlipToBetSelections(slip, fixture);
        expect(result).toHaveLength(1);
        expect(result[0].marketId).toBe("m1");
        expect(result[0].outcomeId).toBe("m1-o0");
        expect(result[0].odds).toBe(2.0);
        expect(result[0].fixtureSlug).toBe("arsenal-vs-chelsea");
        expect(result[0].fixtureName).toBe("Arsenal vs Chelsea");
        expect(result[0].fixtureId).toBe("f1");
        expect(result[0].tournamentName).toBe("Premier League");
        expect(result[0].betType).toBe("compute");
        expect(result[0].active).toBe(true);
        expect(result[0].sport).toBe("soccer");
        expect(result[0].stakeUrl).toBe("https://stake.com/sports/soccer/arsenal-vs-chelsea");
    });

    it("generates deterministic id from slip id + outcome id", () => {
        const result = computeSlipToBetSelections(slip, fixture);
        expect(result[0].id).toBe("slip-0-0-m1-o0");
    });

    it("sets addedAt to a recent timestamp", () => {
        const before = Date.now();
        const result = computeSlipToBetSelections(slip, fixture);
        const after = Date.now();
        expect(result[0].addedAt).toBeGreaterThanOrEqual(before);
        expect(result[0].addedAt).toBeLessThanOrEqual(after);
    });

    it("converts multi-selection slip correctly", () => {
        const multiSlip = makeComputeSlip("slip-1", [
            makeComputeSelection({ marketId: "m1", outcomeId: "m1-o0", odds: 2.0 }),
            makeComputeSelection({ marketId: "m2", outcomeId: "m2-o1", odds: 3.5 }),
        ]);
        const result = computeSlipToBetSelections(multiSlip, fixture);
        expect(result).toHaveLength(2);
        expect(result[0].marketId).toBe("m1");
        expect(result[1].marketId).toBe("m2");
        expect(result[1].outcomeId).toBe("m2-o1");
    });

    it("handles fixture with missing optional fields", () => {
        const minimalFixture = makeFixture({
            tournament: { name: "", slug: undefined, category: { name: "", slug: undefined } },
            sport: undefined,
            stakeUrl: undefined,
        });
        const result = computeSlipToBetSelections(slip, minimalFixture);
        expect(result[0].tournamentName).toBe("");
        expect(result[0].sport).toBeUndefined();
        expect(result[0].stakeUrl).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// useCompute hook — initial state
// ═══════════════════════════════════════════════════════════════════════════════

describe("useCompute", () => {
    describe("initial state", () => {
        it("returns default config", () => {
            const { result } = renderHook(() => useCompute(null));
            expect(result.current.config).toEqual({ groups: 3, marketsPerGroup: 2 });
        });

        it("returns null result initially", () => {
            const { result } = renderHook(() => useCompute(null));
            expect(result.current.result).toBeNull();
        });

        it("is not loading initially", () => {
            const { result } = renderHook(() => useCompute(null));
            expect(result.current.isLoading).toBe(false);
        });

        it("has no error initially", () => {
            const { result } = renderHook(() => useCompute(null));
            expect(result.current.error).toBeNull();
        });

        it("permutationCount is 0 when no data loaded", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));
            expect(result.current.permutationCount).toBe(0);
        });

        it("canGenerate is false when permutationCount is 0", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));
            expect(result.current.canGenerate).toBe(false);
        });
    });

    // ─── runCompute ──────────────────────────────────────────────────────────

    describe("runCompute", () => {
        it("sets error when fixture is null", async () => {
            const { result } = renderHook(() => useCompute(null));
            await act(async () => {
                await result.current.runCompute();
            });
            expect(result.current.error).toBe("No fixture selected");
        });

        it("fetches fixture details and generates slips on success", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main Markets", [
                    { id: "m1", name: "Match Winner", odds: [2.0, 3.5, 4.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            expect(mockGetFixtureDetails).toHaveBeenCalledWith("arsenal-vs-chelsea");
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.result).not.toBeNull();
            expect(result.current.result!.fixtureName).toBe("Arsenal vs Chelsea");
            expect(result.current.result!.fixtureSlug).toBe("arsenal-vs-chelsea");
        });

        it("sets isLoading to true during fetch", async () => {
            let resolvePromise: any;
            mockGetFixtureDetails.mockReturnValue(
                new Promise((resolve) => {
                    resolvePromise = resolve;
                }),
            );

            const { result } = renderHook(() => useCompute(makeFixture()));

            act(() => {
                result.current.runCompute();
            });

            // Wait a tick for the async to start
            await waitFor(() => {
                expect(result.current.isLoading).toBe(true);
            });

            // Resolve the promise
            await act(async () => {
                resolvePromise({
                    fixture: {} as any,
                    marketGroups: [],
                });
            });

            expect(result.current.isLoading).toBe(false);
        });

        it("handles API fetch failure with error message", async () => {
            mockGetFixtureDetails.mockRejectedValue(new Error("Network timeout"));

            const { result } = renderHook(() => useCompute(makeFixture()));

            await act(async () => {
                await result.current.runCompute();
            });

            expect(result.current.error).toBe("Network timeout");
            expect(result.current.isLoading).toBe(false);
            expect(result.current.result).toBeNull();
        });

        it("handles non-Error thrown values", async () => {
            mockGetFixtureDetails.mockRejectedValue("string error");

            const { result } = renderHook(() => useCompute(makeFixture()));

            await act(async () => {
                await result.current.runCompute();
            });

            expect(result.current.error).toBe("Failed to fetch fixture details");
        });

        it("generates correct permutation count for multi-group data", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
                makeApiMarketGroup("goals", "Goals", [
                    { id: "m2", name: "Over/Under", odds: [1.8, 2.2] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // 2 markets × 2 outcomes each = 4 permutations
            expect(result.current.result!.totalPermutations).toBe(4);
            expect(result.current.result!.slips).toHaveLength(4);
        });
    });

    // ─── retry ───────────────────────────────────────────────────────────────

    describe("retry", () => {
        it("re-runs the compute pipeline after failure", async () => {
            mockGetFixtureDetails
                .mockRejectedValueOnce(new Error("First failure"))
                .mockResolvedValueOnce({
                    fixture: {} as any,
                    marketGroups: [
                        makeApiMarketGroup("main", "Main", [
                            { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                        ]),
                    ],
                });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            // First attempt fails
            await act(async () => {
                await result.current.runCompute();
            });
            expect(result.current.error).toBe("First failure");

            // Retry succeeds
            await act(async () => {
                await result.current.retry();
            });
            expect(result.current.error).toBeNull();
            expect(result.current.result).not.toBeNull();
        });
    });

    // ─── clearError ──────────────────────────────────────────────────────────

    describe("clearError", () => {
        it("clears the error state", async () => {
            mockGetFixtureDetails.mockRejectedValue(new Error("fail"));
            const { result } = renderHook(() => useCompute(makeFixture()));

            await act(async () => {
                await result.current.runCompute();
            });
            expect(result.current.error).toBe("fail");

            act(() => {
                result.current.clearError();
            });
            expect(result.current.error).toBeNull();
        });
    });

    // ─── config changes ─────────────────────────────────────────────────────

    describe("config changes", () => {
        it("setConfig updates the config", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));

            act(() => {
                result.current.setConfig({ groups: 2, marketsPerGroup: 1 });
            });

            expect(result.current.config).toEqual({ groups: 2, marketsPerGroup: 1 });
        });

        it("permutationCount stays 0 until data is loaded", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));

            act(() => {
                result.current.setConfig({ groups: 5, marketsPerGroup: 3 });
            });

            // No data loaded yet, so count is still 0
            expect(result.current.permutationCount).toBe(0);
        });
    });

    // ─── permutationCount after data load ────────────────────────────────────

    describe("permutationCount", () => {
        it("updates after successful compute", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0, 4.0] },
                    { id: "m2", name: "BTTS", odds: [1.5, 2.5] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const { result } = renderHook(() => useCompute(makeFixture()));

            // Initially 0
            expect(result.current.permutationCount).toBe(0);

            await act(async () => {
                await result.current.runCompute();
            });

            // Config is { groups: 3, marketsPerGroup: 2 }, but we only have 1 group with 2 markets
            // selectTopGroups(1 group, 3) → 1 group
            // rankMarketsInGroup(2 markets, 2) → 2 markets
            // Market m1: 3 outcomes, Market m2: 2 outcomes → 3 * 2 = 6
            expect(result.current.permutationCount).toBe(6);
        });

        it("recomputes when config changes after data load", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0, 4.0] },
                    { id: "m2", name: "BTTS", odds: [1.5, 2.5] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const { result } = renderHook(() => useCompute(makeFixture()));

            await act(async () => {
                await result.current.runCompute();
            });

            // Default config: groups=3, marketsPerGroup=2 → 1 group, 2 markets → 6 permutations
            expect(result.current.permutationCount).toBe(6);

            // Change to groups=1, marketsPerGroup=1 → 1 group, 1 market → 3 outcomes → 3
            act(() => {
                result.current.setConfig({ groups: 1, marketsPerGroup: 1 });
            });

            expect(result.current.permutationCount).toBe(3);

            // Change to groups=1, marketsPerGroup=2 → 1 group, 2 markets → 6
            act(() => {
                result.current.setConfig({ groups: 1, marketsPerGroup: 2 });
            });

            expect(result.current.permutationCount).toBe(6);
        });
    });

    // ─── canGenerate ────────────────────────────────────────────────────────

    describe("canGenerate", () => {
        it("is true when permutationCount is between 1 and MAX_PERMUTATIONS", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const { result } = renderHook(() => useCompute(makeFixture()));
            await act(async () => {
                await result.current.runCompute();
            });

            // 1 market × 2 outcomes = 2 permutations
            expect(result.current.canGenerate).toBe(true);
        });

        it("is false when permutationCount exceeds MAX_PERMUTATIONS", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0, 4.0] },
                    { id: "m2", name: "BTTS", odds: [1.5, 2.5, 3.5] },
                    { id: "m3", name: "CS", odds: [2.0, 2.5, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const { result } = renderHook(() => useCompute(makeFixture()));
            await act(async () => {
                await result.current.runCompute();
            });

            // Config: groups=3, marketsPerGroup=2 → 1 group, 2 markets
            // m1(3) * m2(3) = 9 ≤ 15, so canGenerate is true
            expect(result.current.permutationCount).toBe(9);
            expect(result.current.canGenerate).toBe(true);

            // Now set config to include 3 markets → 3*3 = 27 > 15
            act(() => {
                result.current.setConfig({ groups: 1, marketsPerGroup: 3 });
            });

            // After config change: m1(3) * m2(3) * m3(3) = 27
            expect(result.current.permutationCount).toBe(27);
            expect(result.current.canGenerate).toBe(false);
        });

        it("is false when permutationCount is 0", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));
            expect(result.current.canGenerate).toBe(false);
        });
    });

    // ─── addSlipToBetSlip ──────────────────────────────────────────────────

    describe("addSlipToBetSlip", () => {
        it("adds a single slip's selections to the store", () => {
            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            const slip = makeComputeSlip("test-slip-1", [
                makeComputeSelection({ marketId: "m1", outcomeId: "m1-o0", odds: 2.0 }),
                makeComputeSelection({ marketId: "m2", outcomeId: "m2-o1", odds: 3.5 }),
            ]);

            act(() => {
                result.current.addSlipToBetSlip(slip);
            });

            const selections = useSlipStore.getState().selections;
            expect(selections).toHaveLength(2);
            expect(selections[0].marketId).toBe("m1");
            expect(selections[1].marketId).toBe("m2");
            expect(selections[0].betType).toBe("compute");
        });

        it("no-op when fixture is null", () => {
            const { result } = renderHook(() => useCompute(null));

            const slip = makeComputeSlip("test-slip-1", [
                makeComputeSelection(),
            ]);

            act(() => {
                result.current.addSlipToBetSlip(slip);
            });

            expect(useSlipStore.getState().selections).toHaveLength(0);
        });
    });

    // ─── addSelectedSlips ───────────────────────────────────────────────────

    describe("addSelectedSlips", () => {
        it("adds only the slips matching the given IDs", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // 2 slips generated
            const slipIds = result.current.result!.slips.map((s) => s.id);
            expect(slipIds).toHaveLength(2);

            // Add only the first slip
            act(() => {
                result.current.addSelectedSlips([slipIds[0]]);
            });

            // Each slip has 1 selection (1 market), so 1 BetSelection total
            expect(useSlipStore.getState().selections).toHaveLength(1);
        });

        it("no-op when result is null", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));

            act(() => {
                result.current.addSelectedSlips(["nonexistent-id"]);
            });

            expect(useSlipStore.getState().selections).toHaveLength(0);
        });

        it("ignores IDs that don't match any slip", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            act(() => {
                result.current.addSelectedSlips(["totally-fake-id"]);
            });

            expect(useSlipStore.getState().selections).toHaveLength(0);
        });
    });

    // ─── addAllSlips ────────────────────────────────────────────────────────

    describe("addAllSlips", () => {
        it("adds all generated slips to the store", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                    { id: "m2", name: "BTTS", odds: [1.5, 2.5] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // 2 markets × 2 outcomes = 4 permutations, each with 2 selections = 8 BetSelections
            act(() => {
                result.current.addAllSlips();
            });

            expect(useSlipStore.getState().selections).toHaveLength(8);
        });

        it("no-op when result is null", () => {
            const { result } = renderHook(() => useCompute(makeFixture()));

            act(() => {
                result.current.addAllSlips();
            });

            expect(useSlipStore.getState().selections).toHaveLength(0);
        });
    });

    // ─── Edge cases ─────────────────────────────────────────────────────────

    describe("edge cases", () => {
        it("handles API returning empty marketGroups", async () => {
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: [],
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            expect(result.current.result).not.toBeNull();
            expect(result.current.result!.slips).toHaveLength(0);
            expect(result.current.result!.totalPermutations).toBe(0);
            expect(result.current.permutationCount).toBe(0);
            expect(result.current.canGenerate).toBe(false);
        });

        it("handles markets with no active outcomes", async () => {
            const groups: StakeGroupWithMarkets[] = [
                {
                    name: "main",
                    translation: "Main",
                    rank: 1,
                    templates: [
                        {
                            id: "t1",
                            extId: "ext-t1",
                            rank: 1,
                            name: "Template",
                            markets: [
                                {
                                    id: "m1",
                                    name: "Suspended Market",
                                    status: "suspended",
                                    extId: "ext-m1",
                                    provider: "test",
                                    outcomes: [
                                        makeOutcome("m1-o0", 2.0, false),
                                        makeOutcome("m1-o1", 3.0, false),
                                    ],
                                },
                                {
                                    id: "m2",
                                    name: "Active Market",
                                    status: "active",
                                    extId: "ext-m2",
                                    provider: "test",
                                    outcomes: [
                                        makeOutcome("m2-o0", 1.8, true),
                                        makeOutcome("m2-o1", 2.2, true),
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // Only m2 should be included (m1 has no active outcomes)
            // Config: groups=3, marketsPerGroup=2 → 1 group, 1 market (only 1 has active outcomes)
            expect(result.current.result!.totalPermutations).toBe(2);
            expect(result.current.result!.slips).toHaveLength(2);

            // Verify only m2 selections
            for (const slip of result.current.result!.slips) {
                expect(slip.selections).toHaveLength(1);
                expect(slip.selections[0].marketId).toBe("m2");
            }
        });

        it("handles fewer groups than configured", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
                // Only 2 groups but config asks for 3
                makeApiMarketGroup("goals", "Goals", [
                    { id: "m2", name: "O/U", odds: [1.8, 2.2] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // Config: groups=3, marketsPerGroup=2 → selectTopGroups(2, 3) → 2 groups
            // m1(2) * m2(2) = 4
            expect(result.current.result!.totalPermutations).toBe(4);
            expect(result.current.result!.selectedGroups).toHaveLength(2);
        });

        it("handles fewer markets than configured per group", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0, 4.0] },
                    // Only 1 market but config asks for 2
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // Config: groups=3, marketsPerGroup=2 → 1 group, 1 market (only 1 available)
            expect(result.current.result!.totalPermutations).toBe(3);
            expect(result.current.result!.selectedGroups[0].markets).toHaveLength(1);
        });

        it("handles fixture with null tournament", async () => {
            const fixture = makeFixture({
                tournament: undefined as any,
            });

            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            expect(result.current.result).not.toBeNull();
            expect(result.current.result!.fixtureName).toBe("Arsenal vs Chelsea");
        });

        it("store accumulates selections across multiple addAllSlips calls", async () => {
            const groups: StakeGroupWithMarkets[] = [
                makeApiMarketGroup("main", "Main", [
                    { id: "m1", name: "Winner", odds: [2.0, 3.0] },
                ]),
            ];
            mockGetFixtureDetails.mockResolvedValue({
                fixture: {} as any,
                marketGroups: groups,
            });

            const fixture = makeFixture();
            const { result } = renderHook(() => useCompute(fixture));

            await act(async () => {
                await result.current.runCompute();
            });

            // 2 slips × 1 selection each = 2
            act(() => {
                result.current.addAllSlips();
            });
            expect(useSlipStore.getState().selections).toHaveLength(2);

            // Add again — store deduplicates by id, so still 2
            act(() => {
                result.current.addAllSlips();
            });
            expect(useSlipStore.getState().selections).toHaveLength(2);
        });
    });
});
