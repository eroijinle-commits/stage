import { describe, it, expect } from "vitest";
import { generateAllPermutations, estimateTotalCount } from "@/lib/compute/cartesian";
import type { RankedMarket } from "@/lib/compute/types";
import { MAX_PERMUTATIONS } from "@/lib/compute/types";

// ─── helpers ────────────────────────────────────────────────────────────────
function makeOutcome(id: string, odds: number, active = true) {
    return { __typename: "SportMarketOutcome" as const, id, active, odds, name: `Outcome ${id}` };
}

function makeMarket(id: string, name: string, oddsList: number[]): RankedMarket {
    const outcomes = oddsList.map((odds, i) => makeOutcome(`${id}-o${i}`, odds));
    return {
        market: {
            id,
            name,
            status: "active",
            extId: `ext-${id}`,
            provider: "test",
            outcomes,
        },
        highestOdds: Math.max(...oddsList),
        outcomeCount: oddsList.length,
    };
}

// ─── estimateTotalCount ─────────────────────────────────────────────────────
describe("estimateTotalCount", () => {
    it("returns 1 for empty array", () => {
        expect(estimateTotalCount([])).toBe(1);
    });

    it("returns 2 for single market with 2 outcomes", () => {
        const m = makeMarket("m1", "M1", [2.0, 3.0]);
        expect(estimateTotalCount([m])).toBe(2);
    });

    it("returns 9 for 2 markets with 3 outcomes each", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0, 4.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5, 3.5]);
        expect(estimateTotalCount([m1, m2])).toBe(9);
    });

    it("returns value > MAX_PERMUTATIONS for large array", () => {
        // 5 ternary markets: 3⁵ = 243 > MAX_PERMUTATIONS (81)
        const markets = Array.from({ length: 5 }, (_, i) =>
            makeMarket(`m${i}`, `M${i}`, [2.0, 3.0, 4.0]),
        );
        const result = estimateTotalCount(markets);
        expect(result).toBe(243);
        expect(result).toBeGreaterThan(MAX_PERMUTATIONS);
    });

    it("returns 8 for 3 markets with 2 outcomes each", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0]);
        const m2 = makeMarket("m2", "M2", [2.0, 3.0]);
        const m3 = makeMarket("m3", "M3", [2.0, 3.0]);
        expect(estimateTotalCount([m1, m2, m3])).toBe(8);
    });

    it("returns 16 for 4 markets with 2 outcomes each", () => {
        const markets = Array.from({ length: 4 }, (_, i) =>
            makeMarket(`m${i}`, `M${i}`, [2.0, 3.0]),
        );
        expect(estimateTotalCount(markets)).toBe(16);
    });

    it("returns 6 for mixed outcome counts (3*2)", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0, 4.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5]);
        expect(estimateTotalCount([m1, m2])).toBe(6);
    });
});

// ─── generateAllPermutations ────────────────────────────────────────────────
describe("generateAllPermutations", () => {
    it("returns empty array for empty input", () => {
        expect(generateAllPermutations([])).toEqual([]);
    });

    it("generates 2 slips for 1 market with 2 outcomes", () => {
        const m = makeMarket("m1", "Market 1", [2.0, 3.0]);
        const slips = generateAllPermutations([m]);
        expect(slips).toHaveLength(2);

        // First slip: outcome 0 (odds 2.0)
        expect(slips[0].selections).toHaveLength(1);
        expect(slips[0].selections[0].odds).toBe(2.0);
        expect(slips[0].selections[0].outcomeId).toBe("m1-o0");
        expect(slips[0].totalCombinedOdds).toBe(2.0);

        // Second slip: outcome 1 (odds 3.0)
        expect(slips[1].selections[0].odds).toBe(3.0);
        expect(slips[1].selections[0].outcomeId).toBe("m1-o1");
        expect(slips[1].totalCombinedOdds).toBe(3.0);
    });

    it("generates 4 slips for 2 markets with 2 outcomes each", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5]);
        const slips = generateAllPermutations([m1, m2]);
        expect(slips).toHaveLength(4);

        // Verify combined odds (product of outcome odds)
        // m1-o0(2.0) * m2-o0(1.5) = 3.0
        expect(slips[0].totalCombinedOdds).toBeCloseTo(3.0);
        // m1-o0(2.0) * m2-o1(2.5) = 5.0
        expect(slips[1].totalCombinedOdds).toBeCloseTo(5.0);
        // m1-o1(3.0) * m2-o0(1.5) = 4.5
        expect(slips[2].totalCombinedOdds).toBeCloseTo(4.5);
        // m1-o1(3.0) * m2-o1(2.5) = 7.5
        expect(slips[3].totalCombinedOdds).toBeCloseTo(7.5);
    });

    it("generates 9 slips for 2 markets with 3 outcomes each", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0, 4.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5, 3.5]);
        const slips = generateAllPermutations([m1, m2]);
        expect(slips).toHaveLength(9);
    });

    it("generates correct slips from flat array", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5]);
        const slips = generateAllPermutations([m1, m2]);
        expect(slips).toHaveLength(4);

        // Each slip should have 2 selections (one per market)
        for (const slip of slips) {
            expect(slip.selections).toHaveLength(2);
        }
    });

    it("each slip has a deterministic, unique ID", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0]);
        const m2 = makeMarket("m2", "M2", [1.5, 2.5]);
        const slips = generateAllPermutations([m1, m2]);

        const ids = slips.map((s) => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length); // all unique
    });

    it("selections contain correct market and outcome info", () => {
        const m1 = makeMarket("m1", "Winner", [2.0, 3.0]);
        const slips = generateAllPermutations([m1]);

        expect(slips[0].selections[0].marketId).toBe("m1");
        expect(slips[0].selections[0].marketName).toBe("Winner");
        expect(slips[0].selections[0].outcomeName).toBe("Outcome m1-o0");
    });

    it("returns empty for market with 0 outcomes", () => {
        const m1: RankedMarket = {
            market: {
                id: "m1",
                name: "Empty",
                status: "active",
                extId: "ext-m1",
                provider: "test",
                outcomes: [],
            },
            highestOdds: 0,
            outcomeCount: 0,
        };
        const slips = generateAllPermutations([m1]);
        expect(slips).toEqual([]);
    });

    it("excludes inactive outcomes from permutations", () => {
        const m1 = makeMarket("m1", "M1", [2.0]);
        // Manually add an inactive outcome
        m1.market.outcomes.push(makeOutcome("m1-inactive", 5.0, false));
        m1.outcomeCount = 1; // only 1 active

        const slips = generateAllPermutations([m1]);
        expect(slips).toHaveLength(1);
        expect(slips[0].selections[0].odds).toBe(2.0);
        expect(slips[0].selections[0].outcomeId).toBe("m1-o0");
    });

    it("generates exact permutation count from estimateTotalCount", () => {
        const m1 = makeMarket("m1", "M1", [2.0, 3.0, 4.0]);
        const m2 = makeMarket("m2", "M2", [2.0, 3.0, 4.0]);
        const m3 = makeMarket("m3", "M3", [2.0, 3.0, 4.0]);
        const slips = generateAllPermutations([m1, m2, m3]);
        // estimateTotalCount returns 27 (3³)
        expect(slips.length).toBe(27);
        expect(slips.length).toBe(estimateTotalCount([m1, m2, m3]));
    });

    it("generates 16 slips for 4 binary markets (2^4)", () => {
        const markets = Array.from({ length: 4 }, (_, i) =>
            makeMarket(`m${i}`, `M${i}`, [2.0, 3.0]),
        );
        const slips = generateAllPermutations(markets);
        expect(slips).toHaveLength(16);
    });

    it("generates 81 slips for 4 ternary markets (3^4)", () => {
        const markets = Array.from({ length: 4 }, (_, i) =>
            makeMarket(`m${i}`, `M${i}`, [2.0, 3.0, 4.0]),
        );
        const slips = generateAllPermutations(markets);
        expect(slips).toHaveLength(81);
    });
});
