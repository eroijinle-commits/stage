import { describe, it, expect } from "vitest";
import {
  MAX_PERMUTATIONS,
  SLIP_OPTIONS,
  marketsNeeded,
  estimatePermutations,
} from "@/lib/compute/types";
import type { RankedMarket } from "@/lib/compute/types";

// ─── helpers ────────────────────────────────────────────────────────────────
function makeRankedMarket(outcomeCount: number, name = "market"): RankedMarket {
  const outcomes = Array.from({ length: outcomeCount }, (_, i) => ({
    __typename: "SportMarketOutcome" as const,
    id: `o-${i}`,
    name: `Outcome ${i}`,
    active: true,
    odds: 1.5 + i,
  }));
  return {
    market: {
      id: `mkt-${name}`,
      name,
      status: "active",
      extId: `ext-${name}`,
      provider: "test",
      outcomes,
    },
    highestOdds: Math.max(...outcomes.map((o) => o.odds)),
    outcomeCount,
  };
}

// ─── MAX_PERMUTATIONS ───────────────────────────────────────────────────────
describe("MAX_PERMUTATIONS", () => {
  it("is 81", () => {
    expect(MAX_PERMUTATIONS).toBe(81);
  });
});

// ─── SLIP_OPTIONS ───────────────────────────────────────────────────────────
describe("SLIP_OPTIONS", () => {
  it("provides [16, 32, 64] for binary markets", () => {
    expect(SLIP_OPTIONS[2]).toEqual([16, 32, 64]);
  });

  it("provides [27, 81] for ternary markets", () => {
    expect(SLIP_OPTIONS[3]).toEqual([27, 81]);
  });
});

// ─── marketsNeeded ──────────────────────────────────────────────────────────
describe("marketsNeeded", () => {
  it("returns 4 for slipCount=16, maxOutcomes=2 (2^4=16)", () => {
    expect(marketsNeeded(16, 2)).toBe(4);
  });

  it("returns 5 for slipCount=32, maxOutcomes=2 (2^5=32)", () => {
    expect(marketsNeeded(32, 2)).toBe(5);
  });

  it("returns 6 for slipCount=64, maxOutcomes=2 (2^6=64)", () => {
    expect(marketsNeeded(64, 2)).toBe(6);
  });

  it("returns 3 for slipCount=27, maxOutcomes=3 (3^3=27)", () => {
    expect(marketsNeeded(27, 3)).toBe(3);
  });

  it("returns 4 for slipCount=81, maxOutcomes=3 (3^4=81)", () => {
    expect(marketsNeeded(81, 3)).toBe(4);
  });

  it("returns 1 for slipCount=2, maxOutcomes=2", () => {
    expect(marketsNeeded(2, 2)).toBe(1);
  });
});

// ─── estimatePermutations ───────────────────────────────────────────────────
describe("estimatePermutations", () => {
  it("returns 1 for empty array", () => {
    expect(estimatePermutations([])).toBe(1);
  });

  it("returns 2 for a single market with 2 outcomes", () => {
    const m = makeRankedMarket(2);
    expect(estimatePermutations([m])).toBe(2);
  });

  it("returns 9 for 2 markets with 3 outcomes each (3*3)", () => {
    const m1 = makeRankedMarket(3, "m1");
    const m2 = makeRankedMarket(3, "m2");
    expect(estimatePermutations([m1, m2])).toBe(9);
  });

  it("returns 27 for 3 markets with 3 outcomes each (3*3*3)", () => {
    const markets = [
      makeRankedMarket(3, "m1"),
      makeRankedMarket(3, "m2"),
      makeRankedMarket(3, "m3"),
    ];
    expect(estimatePermutations(markets)).toBe(27);
  });

  it("returns early (> MAX_PERMUTATIONS) when count exceeds 81", () => {
    // 5 ternary markets: 3⁵ = 243 > MAX_PERMUTATIONS (81)
    const markets = [
      makeRankedMarket(3),
      makeRankedMarket(3),
      makeRankedMarket(3),
      makeRankedMarket(3),
      makeRankedMarket(3),
    ];
    const result = estimatePermutations(markets);
    expect(result).toBe(243);
    expect(result).toBeGreaterThan(MAX_PERMUTATIONS);
  });

  it("returns 81 exactly for config that hits the cap (4 markets of 3)", () => {
    // 4 ternary markets: 3⁴ = 81 = MAX_PERMUTATIONS (does not exceed)
    const big = [
      makeRankedMarket(3),
      makeRankedMarket(3),
      makeRankedMarket(3),
      makeRankedMarket(3),
    ];
    const result = estimatePermutations(big);
    expect(result).toBe(81);
    expect(result).toBeLessThanOrEqual(MAX_PERMUTATIONS);
  });

  it("returns 8 for mixed outcome counts (2*2*2)", () => {
    const m1 = makeRankedMarket(2, "m1");
    const m2 = makeRankedMarket(2, "m2");
    const m3 = makeRankedMarket(2, "m3");
    expect(estimatePermutations([m1, m2, m3])).toBe(8);
  });

  it("returns 16 for 4 markets with 2 outcomes (2*2*2*2)", () => {
    const markets = [
      makeRankedMarket(2, "m1"),
      makeRankedMarket(2, "m2"),
      makeRankedMarket(2, "m3"),
      makeRankedMarket(2, "m4"),
    ];
    expect(estimatePermutations(markets)).toBe(16);
  });

  it("returns 6 for mixed outcome counts (3*2)", () => {
    const m1 = makeRankedMarket(3, "m1");
    const m2 = makeRankedMarket(2, "m2");
    expect(estimatePermutations([m1, m2])).toBe(6);
  });
});
