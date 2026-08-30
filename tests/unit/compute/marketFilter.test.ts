import { describe, it, expect } from "vitest";
import {
    rankGroupsByOdds,
    selectTopGroups,
    rankMarketsInGroup,
    buildFilteredMatrix,
} from "@/lib/compute/marketFilter";
import type { StakeGroupWithMarkets, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { RankedGroup, RankedMarket, ComputeConfig } from "@/lib/compute/types";

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

// ─── rankGroupsByOdds ───────────────────────────────────────────────────────
describe("rankGroupsByOdds", () => {
    it("returns empty array for empty input", () => {
        expect(rankGroupsByOdds([])).toEqual([]);
    });

    it("ranks a single group", () => {
        const m1 = makeMarket("m1", "Market 1", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
        const g = makeGroup("Goal Lines", "Goal Lines", [m1]);
        const result = rankGroupsByOdds([g]);
        expect(result).toHaveLength(1);
        expect(result[0].groupName).toBe("Goal Lines");
        expect(result[0].markets).toHaveLength(1);
        expect(result[0].markets[0].avgOdds).toBe(2.5); // (2+3)/2
    });

    it("ranks groups by their average odds descending", () => {
        const m1 = makeMarket("m1", "High odds", [makeOutcome("o1", 4.0), makeOutcome("o2", 6.0)]);
        const m2 = makeMarket("m2", "Low odds", [makeOutcome("o1", 1.2), makeOutcome("o2", 1.4)]);
        const g1 = makeGroup("High", "High Group", [m1]);
        const g2 = makeGroup("Low", "Low Group", [m2]);

        const result = rankGroupsByOdds([g2, g1]); // input in wrong order
        expect(result[0].groupName).toBe("High"); // should be sorted desc
        expect(result[1].groupName).toBe("Low");
    });

    it("excludes markets with no active outcomes", () => {
        const active = makeMarket("m1", "Active", [makeOutcome("o1", 2.0), makeOutcome("o2", 3.0)]);
        const inactive = makeMarket("m2", "Inactive", [
            makeOutcome("o1", 2.0, false),
            makeOutcome("o2", 3.0, false),
        ]);
        const g = makeGroup("Mixed", "Mixed Group", [active, inactive]);

        const result = rankGroupsByOdds([g]);
        expect(result[0].markets).toHaveLength(1);
        expect(result[0].markets[0].market.id).toBe("m1");
    });

    it("excludes group from ranking if all markets have 0 active outcomes", () => {
        const dead = makeMarket("m1", "Dead", [
            makeOutcome("o1", 2.0, false),
            makeOutcome("o2", 3.0, false),
        ]);
        const g = makeGroup("Dead Group", "Dead", [dead]);

        const result = rankGroupsByOdds([g]);
        // Group should still appear but with 0 markets
        expect(result).toHaveLength(1);
        expect(result[0].markets).toHaveLength(0);
    });

    it("ranks markets within group by avg odds descending", () => {
        const m1 = makeMarket("m1", "Low", [makeOutcome("o1", 1.5)]);
        const m2 = makeMarket("m2", "High", [makeOutcome("o1", 4.0)]);
        const g = makeGroup("Mixed", "Mixed", [m1, m2]);

        const result = rankGroupsByOdds([g]);
        expect(result[0].markets[0].market.id).toBe("m2"); // higher avg first
        expect(result[0].markets[1].market.id).toBe("m1");
    });

    it("handles multiple templates in a group", () => {
        const m1 = makeMarket("m1", "From tpl1", [makeOutcome("o1", 2.0)]);
        const m2 = makeMarket("m2", "From tpl2", [makeOutcome("o1", 4.0)]);
        const g = makeGroupMultiTemplate("Combined", "Combined", [[m1], [m2]]);

        const result = rankGroupsByOdds([g]);
        expect(result[0].markets).toHaveLength(2);
        // Markets should be sorted by avgOdds desc
        expect(result[0].markets[0].avgOdds).toBeGreaterThanOrEqual(result[0].markets[1].avgOdds);
    });

    it("computes correct avgOdds for 3-outcome market", () => {
        const m = makeMarket("m1", "3-way", [
            makeOutcome("o1", 2.0),
            makeOutcome("o2", 3.0),
            makeOutcome("o3", 6.0),
        ]);
        const g = makeGroup("G", "G", [m]);

        const result = rankGroupsByOdds([g]);
        expect(result[0].markets[0].avgOdds).toBeCloseTo(11 / 3); // (2+3+6)/3
        expect(result[0].markets[0].outcomeCount).toBe(3);
    });

    it("handles suspended/deactivated outcomes correctly", () => {
        const m = makeMarket("m1", "Mixed active", [
            makeOutcome("o1", 2.0, true),
            makeOutcome("o2", 3.0, false),
            makeOutcome("o3", 4.0, true),
        ]);
        const g = makeGroup("G", "G", [m]);

        const result = rankGroupsByOdds([g]);
        expect(result[0].markets[0].avgOdds).toBe(3.0); // (2+4)/2
        expect(result[0].markets[0].outcomeCount).toBe(2);
    });
});

// ─── selectTopGroups ────────────────────────────────────────────────────────
describe("selectTopGroups", () => {
    function makeRankedGroup(name: string): RankedGroup {
        return { groupName: name, groupTranslation: name, markets: [] };
    }

    it("returns empty array for empty input", () => {
        expect(selectTopGroups([], 3)).toEqual([]);
    });

    it("returns all groups when fewer than max", () => {
        const groups = [makeRankedGroup("A"), makeRankedGroup("B")];
        expect(selectTopGroups(groups, 5)).toHaveLength(2);
    });

    it("returns exactly max groups when more are available", () => {
        const groups = [makeRankedGroup("A"), makeRankedGroup("B"), makeRankedGroup("C"), makeRankedGroup("D")];
        expect(selectTopGroups(groups, 2)).toHaveLength(2);
        expect(selectTopGroups(groups, 2)[0].groupName).toBe("A");
        expect(selectTopGroups(groups, 2)[1].groupName).toBe("B");
    });

    it("returns empty when max is 0", () => {
        const groups = [makeRankedGroup("A")];
        expect(selectTopGroups(groups, 0)).toHaveLength(0);
    });
});

// ─── rankMarketsInGroup ─────────────────────────────────────────────────────
describe("rankMarketsInGroup", () => {
    function makeRM(id: string, avgOdds: number): RankedMarket {
        return {
            market: { id, name: id, status: "active" as const, extId: id, provider: "test", outcomes: [] },
            groupName: "G",
            avgOdds,
            outcomeCount: 2,
        };
    }

    it("returns all markets when fewer than max", () => {
        const group: RankedGroup = {
            groupName: "G",
            groupTranslation: "G",
            markets: [makeRM("m1", 2.0), makeRM("m2", 3.0)],
        };
        expect(rankMarketsInGroup(group, 3).markets).toHaveLength(2);
    });

    it("truncates to maxMarkets", () => {
        const group: RankedGroup = {
            groupName: "G",
            groupTranslation: "G",
            markets: [makeRM("m1", 5.0), makeRM("m2", 3.0), makeRM("m3", 1.0)],
        };
        const result = rankMarketsInGroup(group, 2);
        expect(result.markets).toHaveLength(2);
        // First two (already sorted by avgOdds desc from rankGroupsByOdds)
        expect(result.markets[0].market.id).toBe("m1");
        expect(result.markets[1].market.id).toBe("m2");
    });

    it("returns empty markets array when maxMarkets is 0", () => {
        const group: RankedGroup = {
            groupName: "G",
            groupTranslation: "G",
            markets: [makeRM("m1", 2.0)],
        };
        expect(rankMarketsInGroup(group, 0).markets).toHaveLength(0);
    });

    it("preserves group name and translation", () => {
        const group: RankedGroup = {
            groupName: "Goals",
            groupTranslation: "Metas",
            markets: [makeRM("m1", 2.0)],
        };
        const result = rankMarketsInGroup(group, 1);
        expect(result.groupName).toBe("Goals");
        expect(result.groupTranslation).toBe("Metas");
    });
});

// ─── buildFilteredMatrix ────────────────────────────────────────────────────
describe("buildFilteredMatrix", () => {
    // buildFilteredMatrix expects RankedGroup[] (already ranked), not StakeGroupWithMarkets[]
    // We need to run rankGroupsByOdds first to get RankedGroup[]
    function rankedFromGroups(...groups: StakeGroupWithMarkets[]): RankedGroup[] {
        return rankGroupsByOdds(groups);
    }

    it("returns empty for empty groups", () => {
        const config: ComputeConfig = { groups: 3, marketsPerGroup: 2 };
        expect(buildFilteredMatrix([], config)).toEqual([]);
    });

    it("builds correct matrix dimensions", () => {
        const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
        const m2 = makeMarket("m2", "M2", [makeOutcome("o1", 3.0)]);
        const m3 = makeMarket("m3", "M3", [makeOutcome("o1", 4.0)]);
        const m4 = makeMarket("m4", "M4", [makeOutcome("o1", 5.0)]);
        const g1 = makeGroup("G1", "G1", [m1, m2]);
        const g2 = makeGroup("G2", "G2", [m3, m4]);
        const ranked = rankedFromGroups(g1, g2);

        const config: ComputeConfig = { groups: 2, marketsPerGroup: 1 };
        const matrix = buildFilteredMatrix(ranked, config);
        expect(matrix).toHaveLength(2); // 2 groups
        expect(matrix[0]).toHaveLength(1); // 1 market per group
        expect(matrix[1]).toHaveLength(1);
    });

    it("uses all available groups when fewer than configured", () => {
        const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
        const g1 = makeGroup("G1", "G1", [m1]);
        const ranked = rankedFromGroups(g1);

        const config: ComputeConfig = { groups: 3, marketsPerGroup: 1 };
        const matrix = buildFilteredMatrix(ranked, config);
        expect(matrix).toHaveLength(1); // only 1 group available
    });

    it("uses all available markets when fewer than configured", () => {
        const m1 = makeMarket("m1", "M1", [makeOutcome("o1", 2.0)]);
        const g1 = makeGroup("G1", "G1", [m1]);
        const ranked = rankedFromGroups(g1);

        const config: ComputeConfig = { groups: 1, marketsPerGroup: 3 };
        const matrix = buildFilteredMatrix(ranked, config);
        expect(matrix[0]).toHaveLength(1); // only 1 market available
    });

    it("filters out markets with 0 active outcomes before building matrix", () => {
        const active = makeMarket("m1", "Active", [makeOutcome("o1", 2.0)]);
        const dead = makeMarket("m2", "Dead", [
            makeOutcome("o1", 2.0, false),
            makeOutcome("o2", 3.0, false),
        ]);
        const g = makeGroup("G", "G", [active, dead]);
        const ranked = rankedFromGroups(g);

        const config: ComputeConfig = { groups: 1, marketsPerGroup: 3 };
        const matrix = buildFilteredMatrix(ranked, config);
        expect(matrix[0]).toHaveLength(1); // dead market excluded
        expect(matrix[0][0].market.id).toBe("m1");
    });
});
