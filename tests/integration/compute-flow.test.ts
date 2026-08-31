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
import { MAX_PERMUTATIONS } from "@/lib/compute/types";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import type { ComputeSlip, RankedMarket, RankedGroup } from "@/lib/compute/types";
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

/** Build a realistic API response with 4 market groups. */
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
    groupName = "main",
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
        groupName,
        avgOdds: oddsList.reduce((s, o) => s + o, 0) / oddsList.length,
        outcomeCount: oddsList.length,
    };
}

// ─── Reset store between tests ───────────────────────────────────────────────

beforeEach(() => {
    useSlipStore.setState({
        selections: [],
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

        // Add all slips to the bet slip store
        act(() => {
            result.current.addAllSlips();
        });

        // Verify selections are in the store
        const { selections } = useSlipStore.getState();
        expect(selections.length).toBeGreaterThan(0);

        // Every selection should have betType "compute"
        selections.forEach((s) => {
            expect(s.betType).toBe("compute");
            expect(s.fixtureSlug).toBe("arsenal-vs-chelsea");
            expect(s.fixtureName).toBe("Arsenal vs Chelsea");
            expect(s.active).toBe(true);
        });

        // Selections should reference valid fixture data
        expect(selections[0].tournamentName).toBe("Premier League");
        expect(selections[0].sport).toBe("soccer");
        expect(selections[0].stakeUrl).toBe(
            "https://stake.com/sports/soccer/arsenal-vs-chelsea",
        );
    });

    it("handles the add-selected flow (subset of slips)", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        expect(result.current.result).not.toBeNull();
        const allSlips = result.current.result!.slips;
        expect(allSlips.length).toBeGreaterThanOrEqual(2);

        // Pick the first 2 slips
        const firstTwoIds = allSlips.slice(0, 2).map((s) => s.id);

        act(() => {
            result.current.addSelectedSlips(firstTwoIds);
        });

        const { selections } = useSlipStore.getState();
        // Each slip has 2 legs (1 market per group × 2 groups), so 2 slips × 2 legs = 4
        expect(selections.length).toBe(4);

        // All should be compute
        selections.forEach((s) => expect(s.betType).toBe("compute"));
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

        expect(result.current.result).not.toBeNull();
        expect(result.current.result!.slips).toHaveLength(0);
        expect(result.current.result!.totalPermutations).toBe(0);

        // addAllSlips should add nothing
        act(() => {
            result.current.addAllSlips();
        });
        expect(useSlipStore.getState().selections).toHaveLength(0);
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

    it("produces 0 permutations when all outcomes are inactive", async () => {
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

        expect(result.current.result!.slips).toHaveLength(0);
        // Note: permutationCount may be 1 due to estimatePermutations returning 1 for empty groups.
        // The key assertion is that no actual slips are generated.
        expect(result.current.result!.totalPermutations).toBe(0);
    });

    it("respects the MAX_PERMUTATIONS cap on permutation count", async () => {
        const fixture = makeFixture();

        // Build a scenario with many outcomes that would exceed the cap
        // 5 groups × 3 markets × 3 outcomes = 1230 > 15
        const bigGroups: StakeGroupWithMarkets[] = Array.from(
            { length: 5 },
            (_, gi) =>
                makeApiGroup(`Group${gi}`, `Group${gi}`, [
                    { id: `g${gi}-m1`, name: `Market A`, odds: [2.0, 3.0, 4.0] },
                    { id: `g${gi}-m2`, name: `Market B`, odds: [1.5, 2.5, 3.5] },
                    { id: `g${gi}-m3`, name: `Market C`, odds: [1.8, 2.2, 5.0] },
                ]),
        );

        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails(bigGroups, fixture));

        const { result } = renderHook(() => useCompute(fixture));

        // Even though API returns many markets, config defaults to 3 groups × 2 markets
        // which should still be under the cap
        await act(async () => {
            await result.current.runCompute();
        });

        // The cap is enforced at the UI level via canGenerate, not in generateAllPermutations.
        // Verify that canGenerate reflects whether the count is within bounds.
        // With default config (3 groups × 2 markets) and 3 outcomes each: 3^6 = 729 > 15.
        // canGenerate should be false since the estimated count exceeds the cap.
        expect(result.current.result!.totalPermutations).toBeGreaterThan(MAX_PERMUTATIONS);
        expect(result.current.canGenerate).toBe(false);
    });

    it("retry re-runs the pipeline with the same config", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        // Wait for auto-fetch to complete
        await waitFor(() => expect(result.current.dataLoaded).toBe(true));

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
        const afterFirst = useSlipStore.getState().selections.length;

        act(() => {
            result.current.addAllSlips();
        });
        const afterSecond = useSlipStore.getState().selections.length;

        expect(afterFirst).toBeGreaterThan(0);
        expect(afterSecond).toBe(afterFirst); // No duplicates
    });

    it("does not add duplicate selections when calling addSelectedSlips with overlapping IDs", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
            ]),
            makeApiGroup("Corners", "Corners", [
                { id: "c1", name: "O/U 9.5", odds: [1.70, 2.20] },
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
        const afterFirst = useSlipStore.getState().selections.length;

        act(() => {
            result.current.addSelectedSlips(slipIds);
        });
        const afterSecond = useSlipStore.getState().selections.length;

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
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const { selections } = useSlipStore.getState();
        // Normal + compute selections coexist
        expect(selections.length).toBeGreaterThan(1);

        const normalOnes = selections.filter((s) => s.betType === "match-winner");
        const computeOnes = selections.filter((s) => s.betType === "compute");

        expect(normalOnes).toHaveLength(1);
        expect(computeOnes.length).toBeGreaterThan(0);
        expect(normalOnes[0].id).toBe("manual-1");
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
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const beforeRemove = useSlipStore.getState().selections.length;
        const computeIds = useSlipStore
            .getState()
            .selections.filter((s) => s.betType === "compute")
            .map((s) => s.id);

        // Remove first compute selection
        useSlipStore.getState().removeSelection(computeIds[0]);

        const afterRemove = useSlipStore.getState().selections;
        expect(afterRemove.length).toBe(beforeRemove - 1);
        expect(
            afterRemove.find((s) => s.id === "manual-1"),
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
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const { selections } = useSlipStore.getState();
        expect(selections.length).toBeGreaterThan(0);

        // Verify every selection has the fields SlipItem uses:
        // fixtureName, outcomeName, marketName, odds, id
        selections.forEach((s) => {
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

    it("compute selections are serializable (for shareSlip / saveSlip)", async () => {
        const fixture = makeFixture();
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        act(() => {
            result.current.addAllSlips();
        });

        const { selections } = useSlipStore.getState();

        // Should be JSON-serializable (no functions, no circular refs)
        const serialized = JSON.stringify(selections);
        const parsed = JSON.parse(serialized) as BetSelection[];
        expect(parsed).toHaveLength(selections.length);
        expect(parsed[0].betType).toBe("compute");
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Pipeline integration: cartesian + marketFilter + useCompute
// ═══════════════════════════════════════════════════════════════════════════════

describe("Compute Flow Integration — Pipeline Chaining", () => {
    it("generateAllPermutations produces correct count for known matrix", () => {
        // 2 markets with 2 outcomes each = 4 permutations
        const market1 = makeRankedMarket("m1", "O/U 2.5", [1.85, 2.10], "Goals");
        const market2 = makeRankedMarket("m2", "BTTS", [1.95, 1.90], "Goals");

        const matrix: RankedMarket[][] = [[market1, market2]];
        const slips = generateAllPermutations(matrix);

        expect(slips).toHaveLength(4);

        // Each slip should have 2 selections
        slips.forEach((slip) => {
            expect(slip.selections).toHaveLength(2);
            expect(slip.id).toMatch(/^slip-/);
            expect(slip.totalCombinedOdds).toBeGreaterThan(0);
        });
    });

    it("produces deterministic slip IDs", () => {
        const market1 = makeRankedMarket("m1", "O/U 2.5", [1.85, 2.10], "Goals");
        const matrix: RankedMarket[][] = [[market1]];

        const run1 = generateAllPermutations(matrix);
        const run2 = generateAllPermutations(matrix);

        expect(run1.map((s) => s.id)).toEqual(run2.map((s) => s.id));
    });

    it("pipeline produces BetSelections with correct odds from API data", async () => {
        const fixture = makeFixture();

        // Simple 1-group, 1-market, 2-outcome scenario
        mockGetFixtureDetails.mockResolvedValue(makeFixtureDetails([
            makeApiGroup("Goals", "Goals", [
                { id: "g1", name: "O/U 2.5", odds: [1.85, 2.10] },
            ]),
        ], fixture));

        const { result } = renderHook(() => useCompute(fixture));

        await act(async () => {
            await result.current.runCompute();
        });

        const slips = result.current.result!.slips;
        expect(slips).toHaveLength(2);

        // Slip 0: first outcome (1.85), Slip 1: second outcome (2.10)
        expect(slips[0].selections[0].odds).toBe(1.85);
        expect(slips[1].selections[0].odds).toBe(2.10);

        // Convert to BetSelections and verify odds preserved
        const betSelections = computeSlipToBetSelections(slips[0], fixture);
        expect(betSelections[0].odds).toBe(1.85);

        const betSelections2 = computeSlipToBetSelections(slips[1], fixture);
        expect(betSelections2[0].odds).toBe(2.10);
    });
});
