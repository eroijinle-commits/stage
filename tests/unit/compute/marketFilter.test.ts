import { describe, it, expect } from "vitest";
import {
  flattenAllMarkets,
  mergeMarketsByName,
  filterByOutcomeCount,
  selectTopMarkets,
} from "@/lib/compute/marketFilter";
import type {
  StakeGroupWithMarkets,
  StakeMarket,
  StakeMarketOutcome,
} from "@/lib/contracts/api.contract";
import type { RankedMarket, ComputeConfig } from "@/lib/compute/types";

// ─── helpers ────────────────────────────────────────────────────────────────
function makeOutcome(id: string, odds: number, active = true): StakeMarketOutcome {
  return { __typename: "SportMarketOutcome" as const, id, active, odds, name: `Outcome ${id}` };
}

function makeMarket(id: string, name: string, outcomes: StakeMarketOutcome[]): StakeMarket {
  return {
    id,
    name,
    status: "active",
    extId: `ext-${id}`,
    provider: "test",
    outcomes,
  };
}

function makeGroup(
  name: string,
  translation: string,
  markets: StakeMarket[],
): StakeGroupWithMarkets {
  return {
    name,
    translation,
    rank: 0,
    templates: [
      {
        id: "tpl-1",
        extId: "ext-tpl-1",
        rank: 1,
        name: "Template 1",
        markets,
      },
    ],
  };
}

function makeGroupMultiTemplate(
  name: string,
  translation: string,
  templateMarkets: StakeMarket[][],
): StakeGroupWithMarkets {
  return {
    name,
    translation,
    rank: 0,
    templates: templateMarkets.map((markets, i) => ({
      id: `tpl-${i}`,
      extId: `ext-tpl-${i}`,
      rank: i + 1,
      name: `Template ${i}`,
      markets,
    })),
  };
}

// ─── flattenAllMarkets ──────────────────────────────────────────────────────
describe("flattenAllMarkets", () => {
  it("returns empty array for empty groups", () => {
    expect(flattenAllMarkets([])).toEqual([]);
  });

  it("flattens markets from a single group with one template", () => {
    const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
    const m2 = makeMarket("m2", "M2", [makeOutcome("o1", 3.0)]);
    const g = makeGroup("G", "G", [m1, m2]);
    const result = flattenAllMarkets([g]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
    expect(result[1].id).toBe("m2");
  });

  it("flattens markets across multiple groups and templates", () => {
    const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
    const m2 = makeMarket("m2", "M2", [makeOutcome("o1", 3.0)]);
    const m3 = makeMarket("m3", "M3", [makeOutcome("o1", 4.0)]);
    const g1 = makeGroup("G1", "G1", [m1]);
    const g2 = makeGroupMultiTemplate("G2", "G2", [[m2], [m3]]);

    const result = flattenAllMarkets([g1, g2]);
    expect(result).toHaveLength(3);
    expect(result.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
  });
});

// ─── mergeMarketsByName ────────────────────────────────────────────────────
describe("mergeMarketsByName", () => {
  it("returns empty array for empty input", () => {
    expect(mergeMarketsByName([])).toEqual([]);
  });

  it("passes through markets with unique names", () => {
    const m1 = makeMarket("m1", "Match Winner", [makeOutcome("o1", 2.0)]);
    const m2 = makeMarket("m2", "Total Goals", [makeOutcome("o2", 3.0)]);
    const result = mergeMarketsByName([m1, m2]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("m1");
    expect(result[1].id).toBe("m2");
  });

  it("merges two markets with the same name into one with combined outcomes", () => {
    const m1 = makeMarket("m1", "2nd Half Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "2nd Half Total", [makeOutcome("o3", 1.5), makeOutcome("o4", 2.5)]);
    const result = mergeMarketsByName([m1, m2]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("2nd Half Total");
    expect(result[0].outcomes).toHaveLength(4);
    expect(result[0].id).toBe("m1"); // first market's id
  });

  it("merges three markets with the same name", () => {
    const m1 = makeMarket("m1", "Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "Total", [makeOutcome("o3", 1.5), makeOutcome("o4", 2.5)]);
    const m3 = makeMarket("m3", "Total", [makeOutcome("o5", 1.3), makeOutcome("o6", 3.0)]);
    const result = mergeMarketsByName([m1, m2, m3]);
    expect(result).toHaveLength(1);
    expect(result[0].outcomes).toHaveLength(6);
  });

  it("keeps different-named markets separate while merging same-named ones", () => {
    const m1 = makeMarket("m1", "Match Winner", [makeOutcome("o1", 2.0)]);
    const m2 = makeMarket("m2", "Total", [makeOutcome("o2", 1.8), makeOutcome("o3", 2.0)]);
    const m3 = makeMarket("m3", "Total", [makeOutcome("o4", 1.5), makeOutcome("o5", 2.5)]);
    const result = mergeMarketsByName([m1, m2, m3]);
    expect(result).toHaveLength(2);
    const winner = result.find((m) => m.name === "Match Winner");
    const total = result.find((m) => m.name === "Total");
    expect(winner).toBeDefined();
    expect(winner!.outcomes).toHaveLength(1);
    expect(total).toBeDefined();
    expect(total!.outcomes).toHaveLength(4);
  });

  it("preserves first market's id, extId, provider on merged result", () => {
    const m1 = makeMarket("m1", "Total", [makeOutcome("o1", 1.8)]);
    m1.extId = "ext-first";
    m1.provider = "provider-a";
    const m2 = makeMarket("m2", "Total", [makeOutcome("o2", 2.0)]);
    m2.extId = "ext-second";
    m2.provider = "provider-b";
    const result = mergeMarketsByName([m1, m2]);
    expect(result[0].id).toBe("m1");
    expect(result[0].extId).toBe("ext-first");
    expect(result[0].provider).toBe("provider-a");
  });

  it("trims whitespace when grouping names", () => {
    const m1 = makeMarket("m1", "  Total  ", [makeOutcome("o1", 1.8)]);
    const m2 = makeMarket("m2", "Total", [makeOutcome("o2", 2.0)]);
    const result = mergeMarketsByName([m1, m2]);
    expect(result).toHaveLength(1);
    expect(result[0].outcomes).toHaveLength(2);
  });

  it("merges same-named markets across different groups", () => {
    const m1 = makeMarket("m1", "Match Winner", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
    const m2 = makeMarket("m2", "Match Winner", [makeOutcome("o3", 1.8), makeOutcome("o4", 4.0)]);
    const g1 = makeGroup("Group A", "Group A", [m1]);
    const g2 = makeGroup("Group B", "Group B", [m2]);
    const allMarkets = flattenAllMarkets([g1, g2]);
    const result = mergeMarketsByName(allMarkets);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Match Winner");
    expect(result[0].outcomes).toHaveLength(4);
  });
});

// ─── filterByOutcomeCount ───────────────────────────────────────────────────
describe("filterByOutcomeCount", () => {
  it("returns empty for empty markets", () => {
    expect(filterByOutcomeCount([], 2)).toEqual([]);
  });

  it("includes binary markets when maxOutcomes=2", () => {
    const m1 = makeMarket("m1", "Binary", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
    const result = filterByOutcomeCount([m1], 2);
    expect(result).toHaveLength(1);
    expect(result[0].market.id).toBe("m1");
    expect(result[0].outcomeCount).toBe(2);
    expect(result[0].highestOdds).toBe(3.0);
  });

  it("excludes ternary markets when maxOutcomes=2", () => {
    const m1 = makeMarket("m1", "Binary", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
    const m2 = makeMarket("m2", "Ternary", [
      makeOutcome("o1", 2.0),
      makeOutcome("o2", 3.0),
      makeOutcome("o3", 4.0),
    ]);
    const result = filterByOutcomeCount([m1, m2], 2);
    expect(result).toHaveLength(1);
    expect(result[0].market.id).toBe("m1");
  });

  it("includes ternary markets when maxOutcomes=3", () => {
    const m1 = makeMarket("m1", "Ternary", [
      makeOutcome("o1", 2.0),
      makeOutcome("o2", 3.0),
      makeOutcome("o3", 4.0),
    ]);
    const result = filterByOutcomeCount([m1], 3);
    expect(result).toHaveLength(1);
    expect(result[0].outcomeCount).toBe(3);
  });

  it("excludes markets with 0 active outcomes", () => {
    const active = makeMarket("m1", "Active", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
    const dead = makeMarket("m2", "Dead", [
      makeOutcome("o1", 2.0, false),
      makeOutcome("o2", 3.0, false),
    ]);
    const result = filterByOutcomeCount([active, dead], 2);
    expect(result).toHaveLength(1);
    expect(result[0].market.id).toBe("m1");
  });

  it("ranks by highestOdds descending", () => {
    const m1 = makeMarket("m1", "Low", [makeOutcome("o1", 1.5)]);
    const m2 = makeMarket("m2", "High", [makeOutcome("o1", 4.0)]);
    const m3 = makeMarket("m3", "Mid", [makeOutcome("o1", 2.5)]);
    const result = filterByOutcomeCount([m1, m2, m3], 2);
    expect(result[0].market.id).toBe("m2"); // 4.0
    expect(result[1].market.id).toBe("m3"); // 2.5
    expect(result[2].market.id).toBe("m1"); // 1.5
  });

  it("computes correct highestOdds for 3-outcome market", () => {
    const m = makeMarket("m1", "3-way", [
      makeOutcome("o1", 2.0),
      makeOutcome("o2", 3.0),
      makeOutcome("o3", 6.0),
    ]);
    const result = filterByOutcomeCount([m], 3);
    expect(result[0].highestOdds).toBe(6.0);
    expect(result[0].outcomeCount).toBe(3);
  });

  it("handles suspended/deactivated outcomes correctly", () => {
    const m = makeMarket("m1", "Mixed active", [
      makeOutcome("o1", 2.0, true),
      makeOutcome("o2", 3.0, false),
      makeOutcome("o3", 4.0, true),
    ]);
    const result = filterByOutcomeCount([m], 2);
    expect(result).toHaveLength(1); // 2 active outcomes ≤ 2
    expect(result[0].highestOdds).toBe(4.0);
    expect(result[0].outcomeCount).toBe(2);
  });

  it("handles multiple templates in a group", () => {
    const m1 = makeMarket("m1", "From tpl1", [makeOutcome("o1", 2.0)]);
    const m2 = makeMarket("m2", "From tpl2", [makeOutcome("o1", 4.0)]);
    const g = makeGroupMultiTemplate("Combined", "Combined", [[m1], [m2]]);
    const allMarkets = flattenAllMarkets([g]);
    const result = filterByOutcomeCount(allMarkets, 2);
    expect(result).toHaveLength(2);
    expect(result[0].highestOdds).toBeGreaterThanOrEqual(result[1].highestOdds);
  });
});

// ─── selectTopMarkets ───────────────────────────────────────────────────────
describe("selectTopMarkets", () => {
  it("returns top N markets by highest odds", () => {
    const m1 = makeMarket("m1", "Low", [makeOutcome("o1", 1.5), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "Mid", [makeOutcome("o1", 2.5), makeOutcome("o2", 3.0)]);
    const m3 = makeMarket("m3", "High", [makeOutcome("o1", 4.0), makeOutcome("o2", 5.0)]);
    const g = makeGroup("G", "G", [m1, m2, m3]);

    // slipCount=16, maxOutcomes=2 → needed = log2(16) = 4, but only 3 markets
    // Should throw
    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g], config)).toThrow("Not enough qualifying markets");
  });

  it("returns exactly needed number of markets", () => {
    const markets = Array.from({ length: 6 }, (_, i) =>
      makeMarket(`m${i}`, `M${i}`, [makeOutcome(`o${i}`, 1.5 + i)]),
    );
    const g = makeGroup("G", "G", markets);

    // slipCount=16, maxOutcomes=2 → needed = 4
    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    const result = selectTopMarkets([g], config);
    expect(result).toHaveLength(4);
    // Highest odds first
    expect(result[0].market.id).toBe("m5"); // 6.5
    expect(result[1].market.id).toBe("m4"); // 5.5
  });

  it("throws when fewer markets than needed", () => {
    const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
    const g = makeGroup("G", "G", [m1]);

    // slipCount=16, maxOutcomes=2 → needed = 4, but only 1 market
    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g], config)).toThrow("Not enough qualifying markets");
  });

  it("throws when no markets have qualifying outcome counts", () => {
    const m1 = makeMarket("m1", "Ternary", [
      makeOutcome("o1", 2.0),
      makeOutcome("o2", 3.0),
      makeOutcome("o3", 4.0),
    ]);
    const g = makeGroup("G", "G", [m1]);

    // maxOutcomes=2 excludes ternary
    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g], config)).toThrow("Not enough qualifying markets");
  });

  it("works with ternary config (3 outcomes)", () => {
    const markets = Array.from({ length: 4 }, (_, i) =>
      makeMarket(`m${i}`, `M${i}`, [
        makeOutcome(`o${i}-1`, 1.5 + i),
        makeOutcome(`o${i}-2`, 2.0 + i),
        makeOutcome(`o${i}-3`, 3.0 + i),
      ]),
    );
    const g = makeGroup("G", "G", markets);

    // slipCount=27, maxOutcomes=3 → needed = 3
    const config: ComputeConfig = { maxOutcomes: 3, slipCount: 27 };
    const result = selectTopMarkets([g], config);
    expect(result).toHaveLength(3);
    expect(result.every((m) => m.outcomeCount === 3)).toBe(true);
  });

  it("flattens across groups before selecting", () => {
    const m1 = makeMarket("m1", "Low", [makeOutcome("o1", 1.5), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "High", [makeOutcome("o1", 4.0), makeOutcome("o2", 5.0)]);
    const g1 = makeGroup("G1", "G1", [m1]);
    const g2 = makeGroup("G2", "G2", [m2]);

    // slipCount=16, maxOutcomes=2 → needed = 4, but only 2 markets
    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g1, g2], config)).toThrow("Not enough qualifying markets");
  });

  it("excludes merged markets that exceed maxOutcomes", () => {
    // 3 markets with same name, each with 2 outcomes → merged = 6 outcomes → excluded
    const m1 = makeMarket("m1", "2nd Half Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "2nd Half Total", [makeOutcome("o3", 1.5), makeOutcome("o4", 2.5)]);
    const m3 = makeMarket("m3", "2nd Half Total", [makeOutcome("o5", 1.3), makeOutcome("o6", 3.0)]);
    const g = makeGroup("G", "G", [m1, m2, m3]);

    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g], config)).toThrow("Not enough qualifying markets");
  });

  it("still qualifies unique-named markets when same-named ones are merged out", () => {
    // 2 markets same name (merged → 4 outcomes, excluded) + 4 unique markets (qualify)
    const dup1 = makeMarket("d1", "Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const dup2 = makeMarket("d2", "Total", [makeOutcome("o3", 1.5), makeOutcome("o4", 2.5)]);
    const u1 = makeMarket("u1", "Winner A", [makeOutcome("o5", 2.0), makeOutcome("o6", 3.0)]);
    const u2 = makeMarket("u2", "Winner B", [makeOutcome("o7", 2.5), makeOutcome("o8", 3.5)]);
    const u3 = makeMarket("u3", "Winner C", [makeOutcome("o9", 1.8), makeOutcome("o10", 2.8)]);
    const u4 = makeMarket("u4", "Winner D", [makeOutcome("o11", 4.0), makeOutcome("o12", 5.0)]);
    const g = makeGroup("G", "G", [dup1, dup2, u1, u2, u3, u4]);

    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    const result = selectTopMarkets([g], config);
    expect(result).toHaveLength(4);
    // None of the selected markets should be "Total"
    expect(result.every((r) => r.market.name !== "Total")).toBe(true);
  });

  it("merges same-named markets across different groups and excludes when exceeding maxOutcomes", () => {
    // "Total" appears in Group A and Group B, each with 2 outcomes
    const m1 = makeMarket("m1", "Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "Total", [makeOutcome("o3", 1.5), makeOutcome("o4", 2.5)]);
    const g1 = makeGroup("Group A", "Group A", [m1]);
    const g2 = makeGroup("Group B", "Group B", [m2]);

    const config: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };
    expect(() => selectTopMarkets([g1, g2], config)).toThrow("Not enough qualifying markets");
  });

  it("selects only one when same-named market across groups has <= maxOutcomes total", () => {
    // "Total" in Group A (2 outcomes) + "Total" in Group B (1 outcome) = 3 outcomes
    // With maxOutcomes=3, slipCount=3 → needed=1 market → merged market qualifies
    const m1 = makeMarket("m1", "Total", [makeOutcome("o1", 1.8), makeOutcome("o2", 2.0)]);
    const m2 = makeMarket("m2", "Total", [makeOutcome("o3", 3.0)]);
    const g1 = makeGroup("Group A", "Group A", [m1]);
    const g2 = makeGroup("Group B", "Group B", [m2]);

    const config: ComputeConfig = { maxOutcomes: 3, slipCount: 3 };
    const result = selectTopMarkets([g1, g2], config);
    expect(result).toHaveLength(1);
    expect(result[0].market.name).toBe("Total");
    expect(result[0].outcomeCount).toBe(3);
  });
});
