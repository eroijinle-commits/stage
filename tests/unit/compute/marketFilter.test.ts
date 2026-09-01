import { describe, it, expect } from "vitest";
import {
    flattenAllMarkets,
    filterByOutcomeCount,
    selectTopMarkets,
} from "@/lib/compute/marketFilter";
import type { StakeGroupWithMarkets, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
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
});
