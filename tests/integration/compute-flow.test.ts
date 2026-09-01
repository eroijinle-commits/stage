/**
 * End-to-end integration tests for the compute feature flow:
 *   fixture → compute pipeline → permutations → add to slip store → verify selections
 *
 * Covers: full happy path, edge cases (empty/0/max), add-selected vs add-all,
 * duplicate prevention, and mixed compute + normal selections.
 *
 * Mocks the Stake API query so tests never hit the network.
 * @module tests/integration/compute-flow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCompute, computeSlipToBetSelections } from "@/hooks/useCompute";
import { useSlipStore } from "@/store/useSlipStore";
import { generateAllPermutations } from "@/lib/compute/cartesian";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import type { ComputeSlip, RankedMarket } from "@/lib/compute/types";
import type { StakeGroupWithMarkets, StakeFixture } from "@/lib/contracts/api.contract";
import type { FixtureDetailsData } from "@/lib/stake-api/queries";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/stake-api/queries", () => ({
    getFixtureDetailsQuery: vi.fn(),
}));

import { getFixtureDetailsQuery } from "@/lib/stake-api/queries";
const mockGetFixtureDetails = vi.mocked(getFixtureDetailsQuery);

// ─── Test helpers ────────────────────────────────────────────────────────────

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
        competitors: [{ name: "Arsenal" }, { name: "Chelsea" }],
        sport: "soccer",
        stakeUrl: "https://stake.com/sports/soccer/arsenal-vs-chelsea",
        ...overrides,
    };
}

/** Build a minimal StakeFixture from a DiscoveryFixture. */
function makeStakeFixture(f: DiscoveryFixture): StakeFixture {
    return {
        id: f.id,
        name: f.name,
        slug: f.slug,
        status: f.status,
        data: {
            __typename: "SportFixtureDataMatch" as const,
            startTime: f.startTime,
            isOutright: false,
            competitors: (f.competitors ?? []).map((c) => ({
                name: c.name,
                defaultName: c.name,
                extId: c.name,
            })),
        },
        tournament: f.tournament
            ? {
                id: "t1",
                name: f.tournament.name,
                slug: f.tournament.slug ?? "",
                category: {
                    id: "c1",
                    name: f.tournament.category.name,
                    slug: f.tournament.category.slug ?? "",
                    sport: { id: "s1", name: f.sport ?? "soccer", slug: f.sport ?? "soccer" },
                },
            }
            : undefined,
    };
}

/** Helper to build a FixtureDetailsData from groups + fixture. */
function makeFixtureDetails(
    marketGroups: StakeGroupWithMarkets[],
    fixture?: DiscoveryFixture,
): FixtureDetailsData {
    const f = fixture ?? makeFixture();
    return { fixture: makeStakeFixture(f), marketGroups };
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

/** Build a StakeGroupWithMarkets with the given market/outcome structure. */
function makeApiGroup(
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
                id: `tpl-${name}`,
                extId: `ext-tpl-${name}`,
                rank: 1,
                name: `Template ${name}`,
                markets: marketConfigs.map((m) => ({
                    id: m.id,
                    name: m.name,
                    status: "active" as const,
                    extId: `ext-${m.id}`,
                    provider: "test",
                    outcomes: m.odds.map((odds, i) =>
                        makeOutcome(`${m.id}-o${i}`, odds),
                    ),
                })),
            },
        ],
    };
}

/** Build a realistic API response with 4 market groups (7 binary + 1 ternary). */
function makeRichApiGroups(): StakeGroupWithMarkets[] {
    return [
        makeApiGroup("Goals", "Goals", [
            { id: "g1", name: "Over/Under 2.5", odds: [1.85, 2.10] },
            { id: "g2", name: "Both Teams To Score", odds: [1.95, 1.90] },
        ]),
        makeApiGroup("Corners", "Corners", [
            { id: "c1", name: "Over/Under 9.5 Corners", odds: [1.70, 2.20] },
            { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
        ]),
        makeApiGroup("Cards", "Cards", [
            { id: "cd1", name: "Over/Under 3.5 Cards", odds: [1.65, 2.30] },
            { id: "cd2", name: "Red Card Yes/No", odds: [6.00, 1.12] },
        ]),
        makeApiGroup("Halftime", "Halftime", [
            { id: "h1", name: "HT Result", odds: [2.50, 3.20, 2.80] },
            { id: "h2", name: "HT Over/Under 1.5", odds: [1.90, 1.90] },
        ]),
    ];
}

function makeRankedMarket(
    id: string,
    name: string,
    oddsList: number[],
): RankedMarket {
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
        highestOdds: Math.max(...oddsList),
        outcomeCount: oddsList.length,
    };
}

// ─── Reset store between tests ───────────────────────────────────────────────

beforeEach(() => {
    useSlipStore.setState({
        selections: [],
        computeSlips: [],
        mode: "singles",
        stakePerLeg: 1000,
        stakeShieldEnabled: false,
        placeResults: [],
        lastError: null,
    });
    mockGetFixtureDetails.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Full happy path: fixture → compute → permutations → add to slip
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Full Happy Path", () => {
    it("fetches fixture, generates permutations, and adds selections to the slip store", async () => {
        const fixture = makeFixture();
        const apiGroups = makeRichApiGroups();

        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails(apiGroups, fixture));

        const { result } = renderHook(() => useCompute(fixture));

        // Initially no result
        expect(result.current.result).toBeNull();
        expect(result.current.isLoading).toBe(false);

        // Run compute
        await act(async () => {
            await result.current.runCompute();
        });

        // Should have generated slips
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.result).not.toBeNull();
        expect(result.current.result!.slips.length).toBeGreaterThan(0);
        expect(result.current.result!.totalPermutations).toBe(
            result.current.result!.slips.length,
        );

        // Add all slips to the bet slip store as isolated entries
        act(() => {
            result.current.addAllSlips();
        });

        // Verify compute slips are isolated in the store
        const { computeSlips } = useSlipStore.getState();
        expect(computeSlips.length).toBeGreaterThan(0);

        // Every compute slip entry should contain selections with betType "compute"
        computeSlips.forEach((cs) => {
            expect(cs.selections.length).toBeGreaterThan(0);
            cs.selections.forEach((s) => {
                expect(s.betType).toBe("compute");
                expect(s.fixtureSlug).toBe("arsenal-vs-chelsea");
                expect(s.fixtureName).toBe("Arsenal vs Chelsea");
                expect(s.active).toBe(true);
            });
        });

        // First entry's selections should reference valid fixture data
        const firstEntrySelections = computeSlips[0].selections;
        expect(firstEntrySelections[0].tournamentName).toBe("Premier League");
        expect(firstEntrySelections[0].sport).toBe("soccer");
        expect(firstEntrySelections[0].stakeUrl).toBe(
            "https://stake.com/sports/soccer/arsenal-vs-chelsea",
        );
    });

    it("handles the add-selected flow (subset of slips)", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        expect(result.current.result).not.toBeNull();
        const allSlips = result.current.result!.slips;
        // 4 binary markets → 2^4 = 16 slips
        expect(allSlips).toHaveLength(16);

        // Pick the first 2 slips
        const firstTwoIds = allSlips.slice(0, 2).map((s) => s.id);

        act(() => {
            result.current.addSelectedSlips(firstTwoIds);
        });

        const { computeSlips: selectedComputeSlips } = useSlipStore.getState();
        // 2 isolated entries, each with 4 legs (4 markets)
        expect(selectedComputeSlips).toHaveLength(2);
        selectedComputeSlips.forEach((cs) => {
            expect(cs.selections).toHaveLength(4);
            cs.selections.forEach((s) => expect(s.betType).toBe("compute"));
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Edge cases
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Edge Cases", () => {
    it("handles API returning empty marketGroups (no permutations)", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        // selectTopMarkets throws → error state
        expect(result.current.result).toBeNull();
        expect(result.current.error).toBeTruthy();

        // addAllSlips should add nothing (result is null)
        act(() => {
            result.current.addAllSlips();
        });
        expect(useSlipStore.getState().computeSlips).toHaveLength(0);
    });

    it("handles API error gracefully", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockRejectedValue(new Error("Network timeout"));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        expect(result.current.error).toBe("Network timeout");
        expect(result.current.result).toBeNull();
        expect(result.current.isLoading).toBe(false);
    });

    it("handles null fixture", async () => {
        const { result } = renderHook(() => useCompute(null));

        await act(async () => {
            await result.current.runCompute();
        });

        expect(result.current.error).toBe("No fixture selected");
        expect(result.current.result).toBeNull();
    });

    it("produces error when all outcomes are inactive (0 qualifying markets)", async () => {
        const fixture = makeFixture();
        const group: StakeGroupWithMarkets = {
            name: "Goals",
            translation: "Goals",
            rank: 1,
            templates: [
                {
                    id: "t1",
                    extId: "ext-t1",
                    rank: 1,
                    name: "Template 1",
                    markets: [
                        {
                            id: "m1",
                            name: "O/U 2.5",
                            status: "active",
                            extId: "ext-m1",
                            provider: "test",
                            outcomes: [
                                makeOutcome("o1", 1.85, false),
                                makeOutcome("o2", 2.10, false),
                            ],
                        },
                    ],
                },
            ],
        };

        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([group], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        // 0 qualifying markets → selectTopMarkets throws
        expect(result.current.error).toBeTruthy();
        expect(result.current.error).toContain("Not enough qualifying markets");
        expect(result.current.result).toBeNull();
    });

    it("config bounds the permutation count regardless of available markets", async () => {
        const fixture = makeFixture();

        // Provide many binary markets (9 binary markets across 3 groups)
        const manyBinaryMarkets: StakeGroupWithMarkets[] = [
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
                { id: "g3", name: "GG/NG", odds: [1.75, 2.15] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
                { id: "c3", name: "First Corner", odds: [2.50, 1.60] },
            ]),
            makeApiGroup("Cards", "Cards", [
                { id: "cd1", name: "O/U 3.5 Cards", odds: [1.65, 2.30] },
                { id: "cd2", name: "Red Card", odds: [6.00, 1.12] },
                { id: "cd3", name: "Card Handicap", odds: [1.90, 1.95] },
            ]),
        ];

        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails(manyBinaryMarkets, fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        // Default config: maxOutcomes=2, slipCount=16 → needed=4
        // Even though 9 binary markets are available, only top 4 are selected
        // 2^4 = 16 permutations, not 2^9 = 512
        expect(result.current.result!.totalPermutations).toBe(16);
        expect(result.current.result!.selectedMarkets).toHaveLength(4);
        expect(result.current.canGenerate).toBe(true);
    });

    it("retry re-runs the pipeline with the same config", async () => {
        const fixture = makeFixture();
        const validGroups = [
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ];
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails(validGroups, fixture));

        const { result } = renderHook(() => useCompute(fixture));

        // Wait for auto-fetch to complete
        await waitFor(() => expect(mockGetFixtureDetails).toHaveBeenCalled());

        // First run
        await act(async () => {
            await result.current.runCompute();
        });
        const firstCount = result.current.result!.slips.length;

        // Retry
        await act(async () => {
            await result.current.retry();
        });

        expect(result.current.result!.slips.length).toBe(firstCount);
        // auto-fetch(1) + runCompute(1) + retry(1) = 3
        expect(mockGetFixtureDetails).toHaveBeenCalledTimes(3);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Duplicate prevention
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Duplicate Prevention", () => {
    it("does not add duplicate selections when calling addAllSlips twice", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        // Add all twice
        act(() => {
            result.current.addAllSlips();
        });
        const afterFirst = useSlipStore.getState().computeSlips.length;

        act(() => {
            result.current.addAllSlips();
        });
        const afterSecond = useSlipStore.getState().computeSlips.length;

        expect(afterFirst).toBeGreaterThan(0);
        expect(afterSecond).toBe(afterFirst); // No duplicates
    });

    it("does not add duplicate selections when calling addSelectedSlips with overlapping IDs", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        const slipIds = result.current.result!.slips.map((s) => s.id);

        // Add same IDs twice
        act(() => {
            result.current.addSelectedSlips(slipIds);
        });
        const afterFirst = useSlipStore.getState().computeSlips.length;

        act(() => {
            result.current.addSelectedSlips(slipIds);
        });
        const afterSecond = useSlipStore.getState().computeSlips.length;

        expect(afterSecond).toBe(afterFirst); // No duplicates
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Mixed compute + normal selections
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Mixed Compute + Normal Selections", () => {
    it("coexists with manually added selections without conflicts", async () => {
        const fixture = makeFixture();

        // Manually add a normal selection first
        const normalSelection: BetSelection = {
            id: "manual-1",
            fixtureSlug: "liverpool-vs-man-utd",
            fixtureName: "Liverpool vs Man United",
            fixtureId: "f2",
            tournamentName: "Premier League",
            marketId: "m99",
            marketName: "Match Winner",
            outcomeId: "o99",
            outcomeName: "Liverpool",
            odds: 2.50,
            active: true,
            startTime: "2026-08-30T17:30:00Z",
            addedAt: Date.now(),
            betType: "match-winner",
            betTypeLine: null,
        };

        useSlipStore.getState().addSelection(normalSelection);
        expect(useSlipStore.getState().selections).toHaveLength(1);

        // Now run compute and add
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        // Manual selection is in selections, compute entries are in computeSlips
        const { selections: mixedSelections, computeSlips: mixedComputeSlips } = useSlipStore.getState();
        const normalOnes = mixedSelections.filter((s) => s.betType === "match-winner");
        expect(normalOnes).toHaveLength(1);
        expect(normalOnes[0].id).toBe("manual-1");
        expect(mixedComputeSlips.length).toBeGreaterThan(0);
        mixedComputeSlips.forEach((cs) => {
            cs.selections.forEach((s) => expect(s.betType).toBe("compute"));
        });
    });

    it("removing a compute selection does not affect normal selections", async () => {
        const fixture = makeFixture();

        const normalSelection: BetSelection = {
            id: "manual-1",
            fixtureSlug: "liverpool-vs-man-utd",
            fixtureName: "Liverpool vs Man United",
            fixtureId: "f2",
            tournamentName: "Premier League",
            marketId: "m99",
            marketName: "Match Winner",
            outcomeId: "o99",
            outcomeName: "Liverpool",
            odds: 2.50,
            active: true,
            startTime: "2026-08-30T17:30:00Z",
            addedAt: Date.now(),
            betType: "match-winner",
            betTypeLine: null,
        };

        useSlipStore.getState().addSelection(normalSelection);

        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const beforeComputeCount = useSlipStore.getState().computeSlips.length;
        expect(beforeComputeCount).toBeGreaterThan(0);

        // Remove first compute slip entry
        const firstComputeEntryId = useSlipStore.getState().computeSlips[0].id;
        useSlipStore.getState().removeComputeSlip(firstComputeEntryId);

        const afterRemoveComputeSlips = useSlipStore.getState().computeSlips;
        expect(afterRemoveComputeSlips.length).toBe(beforeComputeCount - 1);
        // Manual selection should remain untouched
        expect(
            useSlipStore.getState().selections.find((s) => s.id === "manual-1"),
        ).toBeDefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BetSlipDrawer compatibility
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — BetSlipDrawer Compatibility", () => {
    it("compute selections have all fields required by SlipItem rendering", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const { computeSlips: compatComputeSlips } = useSlipStore.getState();
        expect(compatComputeSlips.length).toBeGreaterThan(0);

        // Verify every selection inside each entry has the fields SlipItem uses
        compatComputeSlips.forEach((cs) => {
            cs.selections.forEach((s) => {
                expect(typeof s.id).toBe("string");
                expect(s.id.length).toBeGreaterThan(0);
                expect(typeof s.fixtureName).toBe("string");
                expect(s.fixtureName.length).toBeGreaterThan(0);
                expect(typeof s.outcomeName).toBe("string");
                expect(s.outcomeName.length).toBeGreaterThan(0);
                expect(typeof s.marketName).toBe("string");
                expect(s.marketName.length).toBeGreaterThan(0);
                expect(typeof s.odds).toBe("number");
                expect(s.odds).toBeGreaterThan(0);
                expect(s.betType).toBe("compute");
            });
        });
    });

    it("compute selections are serializable (for shareSlip / saveSlip)", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const { computeSlips: serialComputeSlips } = useSlipStore.getState();

        // Each entry's selections should be JSON-serializable
        serialComputeSlips.forEach((cs) => {
            const serialized = JSON.stringify(cs.selections);
            const parsed = JSON.parse(serialized) as BetSelection[];
            expect(parsed).toHaveLength(cs.selections.length);
            expect(parsed[0].betType).toBe("compute");
        });
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Pipeline integration: cartesian + marketFilter + useCompute
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Pipeline Chaining", () => {
    it("generateAllPermutations produces correct count for known matrix", () => {
        // 2 markets with 2 outcomes each = 4 permutations (flat array)
        const market1 = makeRankedMarket("m1", "O/U 2.5", [1.85, 2.10]);
        const market2 = makeRankedMarket("m2", "BTTS", [1.95, 1.90]);

        const markets: RankedMarket[] = [market1, market2];
        const slips = generateAllPermutations(markets);

        expect(slips).toHaveLength(4);

        // Each slip should have 2 selections
        slips.forEach((slip) => {
            expect(slip.selections).toHaveLength(2);
            expect(slip.id).toMatch(/^slip-/);
            expect(slip.totalCombinedOdds).toBeGreaterThan(0);
        });
    });

    it("produces deterministic slip IDs", () => {
        const market1 = makeRankedMarket("m1", "O/U 2.5", [1.85, 2.10]);
        const markets: RankedMarket[] = [market1];

        const run1 = generateAllPermutations(markets);
        const run2 = generateAllPermutations(markets);

        expect(run1.map((s) => s.id)).toEqual(run2.map((s) => s.id));
    });

    it("pipeline produces BetSelections with correct odds from API data", async () => {
        const fixture = makeFixture();

        // Provide 4 binary markets for default config (needed=4)
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
                { id: "g2", name: "BTTS", odds: [1.95, 1.90] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
                { id: "c2", name: "Corner Handicap", odds: [1.80, 2.00] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        const slips = result.current.result!.slips;
        // 4 binary markets → 2^4 = 16
        expect(slips).toHaveLength(16);

        // Markets are ranked by highestOdds desc: c1(2.20), g1(2.10), c2(2.00), g2(1.95)
        // Slip 0: all first outcomes → c1-o0 (1.70), g1-o0 (1.85), c2-o0 (1.80), g2-o0 (1.95)
        expect(slips[0].selections[0].odds).toBe(1.70); // c1 first outcome
        expect(slips[0].selections[1].odds).toBe(1.85); // g1 first outcome
        expect(slips[0].selections[2].odds).toBe(1.80); // c2 first outcome
        expect(slips[0].selections[3].odds).toBe(1.95); // g2 first outcome

        // Convert to BetSelections and verify odds preserved
        const betSelections = computeSlipToBetSelections(slips[0], fixture);
        expect(betSelections[0].odds).toBe(1.70);
        expect(betSelections[1].odds).toBe(1.85);
    });
});
