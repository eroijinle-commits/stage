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
import type { ComputeSlip, ComputeSelection } from "@/lib/compute/types";
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
    competitors: [{ name: "Arsenal" }, { name: "Chelsea" }],
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

/** 4 binary markets across 2 groups — meets default config needs (needed=4). */
function makeFourBinaryMarkets(): StakeGroupWithMarkets[] {
  return [
    makeApiMarketGroup("Goals", "Goals", [
      { id: "m1", name: "O/U 2.5", odds: [1.85, 2.1] },
      { id: "m2", name: "BTTS", odds: [1.95, 1.9] },
    ]),
    makeApiMarketGroup("Corners", "Corners", [
      { id: "m3", name: "O/U 9.5 Corners", odds: [1.7, 2.2] },
      { id: "m4", name: "Corner Handicap", odds: [1.8, 2.0] },
    ]),
  ];
}

/** 6 binary markets across 3 groups — supports slipCount up to 64. */
function makeSixBinaryMarkets(): StakeGroupWithMarkets[] {
  return [
    makeApiMarketGroup("Goals", "Goals", [
      { id: "m1", name: "O/U 2.5", odds: [1.85, 2.1] },
      { id: "m2", name: "BTTS", odds: [1.95, 1.9] },
    ]),
    makeApiMarketGroup("Corners", "Corners", [
      { id: "m3", name: "O/U 9.5 Corners", odds: [1.7, 2.2] },
      { id: "m4", name: "Corner Handicap", odds: [1.8, 2.0] },
    ]),
    makeApiMarketGroup("Cards", "Cards", [
      { id: "m5", name: "O/U 3.5 Cards", odds: [1.65, 2.3] },
      { id: "m6", name: "Red Card Yes/No", odds: [6.0, 1.12] },
    ]),
  ];
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
    ...overrides,
  };
}

// ─── Store helpers ───────────────────────────────────────────────────────────

function getActiveSelections() {
  const { slips, activeSlipId } = useSlipStore.getState();
  return slips.find((s) => s.id === activeSlipId)?.selections ?? [];
}

/** Count slips added after the initial default one. */
function getSlipCount() {
  return useSlipStore.getState().slips.length;
}

function getSlipById(id: string) {
  return useSlipStore.getState().slips.find((s) => s.id === id);
}

// ─── Reset store between tests ───────────────────────────────────────────────

beforeEach(() => {
  useSlipStore.setState({ slips: [], activeSlipId: "" });
  const id = useSlipStore.getState().createSlip("Default");
  useSlipStore.setState((st) => ({
    activeSlipId: id,
    savedSlips: [],
    placeResults: [],
    lastError: null,
    slips: st.slips.map((s) =>
      s.id === id ? { ...s, mode: "singles", stakePerLeg: 1000, stakeShieldEnabled: false } : s,
    ),
  }));
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
      expect(result.current.config).toEqual({ maxOutcomes: 2, slipCount: 16 });
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
      const groups = makeFourBinaryMarkets();
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
      // 4 binary markets → 2^4 = 16 permutations
      expect(result.current.result!.totalPermutations).toBe(16);
      expect(result.current.result!.slips).toHaveLength(16);
    });

    it("sets isLoading to true during fetch", async () => {
      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      let resolvePromise: any;
      mockGetFixtureDetails.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
      );

      act(() => {
        result.current.runCompute();
      });

      expect(result.current.isLoading).toBe(true);

      resolvePromise({
        fixture: {} as any,
        marketGroups: [],
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
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

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await waitFor(() => expect(result.current.error).toBe("Failed to load fixture data"));

      await act(async () => {
        await result.current.runCompute();
      });

      expect(result.current.error).toBe("Failed to fetch fixture details");
    });

    it("generates correct permutation count for multi-group data", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await act(async () => {
        await result.current.runCompute();
      });

      // 4 binary markets → 2^4 = 16 permutations
      expect(result.current.result!.totalPermutations).toBe(16);
      expect(result.current.result!.slips).toHaveLength(16);
    });
  });

  // ─── retry ───────────────────────────────────────────────────────────────

  describe("retry", () => {
    it("re-runs the compute pipeline after failure", async () => {
      const validData = {
        fixture: {} as any,
        marketGroups: makeFourBinaryMarkets(),
      };

      // Auto-fetch succeeds with valid data on mount
      mockGetFixtureDetails.mockResolvedValue(validData);

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      // Wait for auto-fetch to complete
      await waitFor(() => expect(mockGetFixtureDetails).toHaveBeenCalled());

      // First attempt fails
      mockGetFixtureDetails.mockRejectedValueOnce(new Error("First failure"));
      await act(async () => {
        await result.current.runCompute();
      });
      expect(result.current.error).toBe("First failure");

      // Retry succeeds
      mockGetFixtureDetails.mockResolvedValueOnce(validData);
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
        result.current.setConfig({ maxOutcomes: 3, slipCount: 27 });
      });

      expect(result.current.config).toEqual({ maxOutcomes: 3, slipCount: 27 });
    });

    it("setConfig resets slipCount when maxOutcomes changes", () => {
      const { result } = renderHook(() => useCompute(makeFixture()));

      act(() => {
        result.current.setConfig({ maxOutcomes: 3, slipCount: 81 });
      });

      // When maxOutcomes changes to 3, slipCount resets to SLIP_OPTIONS[3][0] = 27
      expect(result.current.config).toEqual({ maxOutcomes: 3, slipCount: 27 });
    });

    it("permutationCount stays 0 until data is loaded", () => {
      const { result } = renderHook(() => useCompute(makeFixture()));

      act(() => {
        result.current.setConfig({ maxOutcomes: 2, slipCount: 32 });
      });

      // No data loaded yet, so count is still 0
      expect(result.current.permutationCount).toBe(0);
    });
  });

  // ─── permutationCount after data load ────────────────────────────────────

  describe("permutationCount", () => {
    it("updates after successful compute", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const { result } = renderHook(() => useCompute(makeFixture()));

      // Initially 0
      expect(result.current.permutationCount).toBe(0);

      // Wait for auto-fetch to populate marketGroups
      await waitFor(() => expect(result.current.permutationCount).toBe(16));

      // Default config: maxOutcomes=2, slipCount=16 → needed=4
      // 4 qualifying binary markets → 2^4 = 16
      expect(result.current.permutationCount).toBe(16);
    });

    it("recomputes when config changes after data load", async () => {
      const groups = makeSixBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const { result } = renderHook(() => useCompute(makeFixture()));

      // Wait for auto-fetch to populate marketGroups
      await waitFor(() => expect(result.current.permutationCount).toBe(16));

      // Default config: slipCount=16, needed=4, top 4 → 2^4 = 16
      expect(result.current.permutationCount).toBe(16);

      // Change to slipCount=32, needed=5, top 5 → 2^5 = 32
      act(() => {
        result.current.setConfig({ maxOutcomes: 2, slipCount: 32 });
      });
      expect(result.current.permutationCount).toBe(32);

      // Change to slipCount=64, needed=6, top 6 → 2^6 = 64
      act(() => {
        result.current.setConfig({ maxOutcomes: 2, slipCount: 64 });
      });
      expect(result.current.permutationCount).toBe(64);
    });
  });

  // ─── canGenerate ────────────────────────────────────────────────────────

  describe("canGenerate", () => {
    it("is true when enough qualifying markets are available", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const { result } = renderHook(() => useCompute(makeFixture()));
      await waitFor(() => expect(result.current.permutationCount).toBe(16));

      // permutationCount=16 > 0 → canGenerate = true
      expect(result.current.canGenerate).toBe(true);
    });

    it("is true even with high permutation count (config bounds permutations)", async () => {
      const groups = makeSixBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const { result } = renderHook(() => useCompute(makeFixture()));
      await waitFor(() => expect(result.current.permutationCount).toBe(16));

      // Default config limits to 16 permutations — canGenerate is true
      expect(result.current.canGenerate).toBe(true);

      // Change to slipCount=64, needed=6 → 2^6 = 64 — still true
      act(() => {
        result.current.setConfig({ maxOutcomes: 2, slipCount: 64 });
      });
      expect(result.current.permutationCount).toBe(64);
      expect(result.current.canGenerate).toBe(true);
    });

    it("is false when permutationCount is 0", () => {
      const { result } = renderHook(() => useCompute(makeFixture()));
      expect(result.current.canGenerate).toBe(false);
    });
  });

  // ─── addSlipToBetSlip ──────────────────────────────────────────────────

  describe("addSlipToBetSlip", () => {
    it("adds a single slip as an isolated compute slip entry", () => {
      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      const slip = makeComputeSlip("test-slip-1", [
        makeComputeSelection({ marketId: "m1", outcomeId: "m1-o0", odds: 2.0 }),
        makeComputeSelection({ marketId: "m2", outcomeId: "m2-o1", odds: 3.5 }),
      ]);

      const beforeCount = getSlipCount();

      act(() => {
        result.current.addSlipToBetSlip(slip);
      });

      // A new slip was created and is now active
      expect(getSlipCount()).toBe(beforeCount + 1);
      const activeSelections = getActiveSelections();
      expect(activeSelections).toHaveLength(2);
      expect(activeSelections[0].marketId).toBe("m1");
      expect(activeSelections[1].marketId).toBe("m2");
      expect(activeSelections[0].betType).toBe("compute");
    });

    it("no-op when fixture is null", () => {
      const { result } = renderHook(() => useCompute(null));

      const slip = makeComputeSlip("test-slip-1", [makeComputeSelection()]);

      act(() => {
        result.current.addSlipToBetSlip(slip);
      });
      // No-op when fixture is null — no new slip created
    });
  });

  // ─── addSelectedSlips ───────────────────────────────────────────────────

  describe("addSelectedSlips", () => {
    it("adds only the slips matching the given IDs as isolated entries", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await act(async () => {
        await result.current.runCompute();
      });

      // 16 slips generated (4 binary markets → 2^4)
      const slipIds = result.current.result!.slips.map((s) => s.id);
      expect(slipIds).toHaveLength(16);

      // Add only the first slip (4 selections inside one entry)
      const beforeCount = getSlipCount();

      act(() => {
        result.current.addSelectedSlips([slipIds[0]]);
      });

      // 1 new slip was created and is now active
      expect(getSlipCount()).toBe(beforeCount + 1);
      expect(getActiveSelections()).toHaveLength(4);
    });

    it("no-op when result is null", () => {
      const { result } = renderHook(() => useCompute(makeFixture()));

      const beforeCount = getSlipCount();

      act(() => {
        result.current.addSelectedSlips(["nonexistent-id"]);
      });

      // No-op for nonexistent IDs — no new slip created
      expect(getSlipCount()).toBe(beforeCount);
    });

    it("ignores IDs that don't match any slip", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await act(async () => {
        await result.current.runCompute();
      });

      const beforeCount = getSlipCount();

      act(() => {
        result.current.addSelectedSlips(["totally-fake-id"]);
      });

      // No-op for nonexistent IDs — no new slip created
      expect(getSlipCount()).toBe(beforeCount);
    });
  });

  // ─── addAllSlips ────────────────────────────────────────────────────────

  describe("addAllSlips", () => {
    it("adds all generated slips as isolated entries", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await act(async () => {
        await result.current.runCompute();
      });

      const beforeCount = getSlipCount();

      // 16 slips → 16 new entries (last one becomes active)
      act(() => {
        result.current.addAllSlips();
      });

      expect(getSlipCount()).toBe(beforeCount + 16);
      // Active slip has 4 selections (the last one created)
      expect(getActiveSelections()).toHaveLength(4);
      // All 16 new slips exist
      const allSlips = useSlipStore.getState().slips;
      const newSlips = allSlips.slice(beforeCount);
      expect(newSlips).toHaveLength(16);
      newSlips.forEach((s) => {
        expect(s.selections).toHaveLength(4);
      });
    });

    it("no-op when result is null", () => {
      const { result } = renderHook(() => useCompute(makeFixture()));

      act(() => {
        result.current.addAllSlips();
      });

      // No-op when result is null
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

      // selectTopMarkets throws when 0 qualifying markets < needed
      expect(result.current.error).toBeTruthy();
      expect(result.current.result).toBeNull();
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
                  outcomes: [makeOutcome("m1-o0", 2.0, false), makeOutcome("m1-o1", 3.0, false)],
                },
                {
                  id: "m2",
                  name: "Active Market",
                  status: "active",
                  extId: "ext-m2",
                  provider: "test",
                  outcomes: [makeOutcome("m2-o0", 1.8, true), makeOutcome("m2-o1", 2.2, true)],
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

      // Only 1 qualifying market (m2) but default config needs 4 → throws
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Not enough qualifying markets");
    });

    it("handles fewer qualifying markets than needed", async () => {
      const groups: StakeGroupWithMarkets[] = [
        makeApiMarketGroup("main", "Main", [
          { id: "m1", name: "Winner", odds: [2.0, 3.0] },
          { id: "m2", name: "BTTS", odds: [1.8, 2.2] },
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

      // 2 qualifying markets but default config needs 4 → throws
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Not enough qualifying markets");
    });

    it("handles ternary markets filtered by binary config", async () => {
      const groups: StakeGroupWithMarkets[] = [
        makeApiMarketGroup("main", "Main", [{ id: "m1", name: "Winner", odds: [2.0, 3.0, 4.0] }]),
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

      // Ternary market filtered out by maxOutcomes=2 → 0 qualifying → throws
      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain("Not enough qualifying markets");
    });

    it("handles fixture with null tournament", async () => {
      const fixture = makeFixture({
        tournament: undefined as any,
      });

      const groups = makeFourBinaryMarkets();
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

    it("store deduplicates compute slips across multiple addAllSlips calls", async () => {
      const groups = makeFourBinaryMarkets();
      mockGetFixtureDetails.mockResolvedValue({
        fixture: {} as any,
        marketGroups: groups,
      });

      const fixture = makeFixture();
      const { result } = renderHook(() => useCompute(fixture));

      await act(async () => {
        await result.current.runCompute();
      });

      // 16 slips → 16 isolated entries
      act(() => {
        result.current.addAllSlips();
      });
      expect(getSlipCount()).toBe(1 + 16); // 1 default + 16 compute

      // Add again — each call creates new slips (no cross-call dedup in new architecture)
      act(() => {
        result.current.addAllSlips();
      });
      expect(getSlipCount()).toBe(1 + 32); // 1 default + 32 compute
    });
  });
});
