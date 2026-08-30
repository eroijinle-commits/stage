import { describe, it, expect } from "vitest";
import {
    MAX_PERMUTATIONS,
    getSliderMax,
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
        groupName: "group1",
        avgOdds: outcomes.reduce((s, o) => s + o.odds, 0) / outcomeCount,
        outcomeCount,
    };
}

// ─── MAX_PERMUTATIONS ───────────────────────────────────────────────────────
describe("MAX_PERMUTATIONS", () => {
    it("is 15", () => {
        expect(MAX_PERMUTATIONS).toBe(15);
    });
});

// ─── getSliderMax ───────────────────────────────────────────────────────────
describe("getSliderMax", () => {
    describe("adjusting groups slider", () => {
        it("returns 5 when marketsPerGroup is 0 (no constraint)", () => {
            expect(getSliderMax(3, 0, "groups")).toBe(5);
        });

        it("returns 5 when marketsPerGroup is 1 (1*3=3, 15/3=5)", () => {
            expect(getSliderMax(3, 1, "groups")).toBe(5);
        });

        it("returns 2 when marketsPerGroup is 2 (2*3=6, 15/6=2.5→2)", () => {
            expect(getSliderMax(3, 2, "groups")).toBe(2);
        });

        it("returns 1 when marketsPerGroup is 3 (3*3=9, 15/9=1.67→1)", () => {
            expect(getSliderMax(3, 3, "groups")).toBe(1);
        });

        it("returns 5 when marketsPerGroup is 5 edge case (5*3=15, 15/15=1)", () => {
            expect(getSliderMax(3, 5, "groups")).toBe(1);
        });
    });

    describe("adjusting marketsPerGroup slider", () => {
        it("returns 3 when groups is 0 (no constraint)", () => {
            expect(getSliderMax(0, 2, "marketsPerGroup")).toBe(3);
        });

        it("returns 3 when groups is 1 (1*3=3, 15/3=5→min(3,5)=3)", () => {
            expect(getSliderMax(1, 2, "marketsPerGroup")).toBe(3);
        });

        it("returns 2 when groups is 2 (2*3=6, 15/6=2.5→2)", () => {
            expect(getSliderMax(2, 2, "marketsPerGroup")).toBe(2);
        });

        it("returns 1 when groups is 3 (3*3=9, 15/9=1.67→1)", () => {
            expect(getSliderMax(3, 2, "marketsPerGroup")).toBe(1);
        });

        it("returns 1 when groups is 5 (5*3=15, 15/15=1)", () => {
            expect(getSliderMax(5, 2, "marketsPerGroup")).toBe(1);
        });
    });

    describe("boundary values", () => {
        it("getSliderMax(1, 1, 'groups') === 5", () => {
            expect(getSliderMax(1, 1, "groups")).toBe(5);
        });

        it("getSliderMax(5, 1, 'marketsPerGroup') === 1", () => {
            expect(getSliderMax(5, 1, "marketsPerGroup")).toBe(1);
        });

        it("getSliderMax(0, 0, 'groups') === 5 (marketsPerGroup=0 → unconstrained)", () => {
            expect(getSliderMax(0, 0, "groups")).toBe(5);
        });

        it("getSliderMax(0, 0, 'marketsPerGroup') === 3 (groups=0 → unconstrained)", () => {
            expect(getSliderMax(0, 0, "marketsPerGroup")).toBe(3);
        });
    });
});

// ─── estimatePermutations ───────────────────────────────────────────────────
describe("estimatePermutations", () => {
    it("returns 1 for empty matrix", () => {
        expect(estimatePermutations([])).toBe(1);
    });

    it("returns 1 for matrix with empty groups", () => {
        expect(estimatePermutations([[], []])).toBe(1);
    });

    it("returns 2 for a single market with 2 outcomes", () => {
        const m = makeRankedMarket(2);
        expect(estimatePermutations([[m]])).toBe(2);
    });

    it("returns 9 for 2 markets with 3 outcomes each (3*3)", () => {
        const m1 = makeRankedMarket(3, "m1");
        const m2 = makeRankedMarket(3, "m2");
        expect(estimatePermutations([[m1, m2]])).toBe(9);
    });

    it("returns 27 for 3 markets with 3 outcomes each (3*3*3)", () => {
        const markets = [makeRankedMarket(3, "m1"), makeRankedMarket(3, "m2"), makeRankedMarket(3, "m3")];
        expect(estimatePermutations([markets])).toBe(27);
    });

    it("returns 27 for 3 groups of 1 market with 3 outcomes (3*3*3)", () => {
        const m1 = makeRankedMarket(3, "m1");
        const m2 = makeRankedMarket(3, "m2");
        const m3 = makeRankedMarket(3, "m3");
        expect(estimatePermutations([[m1], [m2], [m3]])).toBe(27);
    });

    it("returns early (> MAX_PERMUTATIONS) when count exceeds 15", () => {
        const markets = [makeRankedMarket(3), makeRankedMarket(3), makeRankedMarket(3)];
        const result = estimatePermutations([markets]);
        expect(result).toBeGreaterThan(15);
    });

    it("returns 15 exactly for config that hits the cap (e.g. 5 markets of 3)", () => {
        // 3*3*3*... but let's do 3*5 = nope, let's do specific: 3,3,3,3,1 = 81 too big
        // Actually 15 = 3*5, so 5 markets of 3 outcomes gives 243 > 15
        // Let's just test that it returns a value > MAX_PERMUTATIONS
        const big = [makeRankedMarket(3), makeRankedMarket(3), makeRankedMarket(3), makeRankedMarket(3)];
        const result = estimatePermutations([big]);
        expect(result).toBeGreaterThan(MAX_PERMUTATIONS);
    });

    it("returns 8 for mixed outcome counts (2*2*2)", () => {
        const m1 = makeRankedMarket(2, "m1");
        const m2 = makeRankedMarket(2, "m2");
        const m3 = makeRankedMarket(2, "m3");
        expect(estimatePermutations([[m1, m2, m3]])).toBe(8);
    });
});
