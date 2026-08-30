import type { StakeMarket } from "@/lib/contracts/api.contract";

/** Hard cap on total permutations */
export const MAX_PERMUTATIONS = 15;

/** A market with its computed average odds */
export interface RankedMarket {
    market: StakeMarket;
    groupName: string;
    avgOdds: number;           // average of all active outcome odds
    outcomeCount: number;
}

/** A group with its ranked markets */
export interface RankedGroup {
    groupName: string;
    groupTranslation: string;
    markets: RankedMarket[];   // sorted by avgOdds desc
}

/** One permutation = one bet slip */
export interface ComputeSlip {
    id: string;                // deterministic hash
    selections: ComputeSelection[];
    totalCombinedOdds: number; // product of all outcome odds
}

/** A single leg in a compute slip */
export interface ComputeSelection {
    marketId: string;
    marketName: string;
    outcomeId: string;
    outcomeName: string;
    odds: number;
    groupName: string;
}

/** Compute configuration — slider values */
export interface ComputeConfig {
    groups: number;            // default: 3, range: 1–5
    marketsPerGroup: number;   // default: 2, range: 1–3
}

/** Compute pipeline result */
export interface ComputeResult {
    fixtureName: string;
    fixtureSlug: string;
    config: ComputeConfig;
    selectedGroups: RankedGroup[];
    totalPermutations: number;
    slips: ComputeSlip[];
}

/**
 * Dynamically computes the max allowed value for a slider
 * given current config, ensuring product never exceeds MAX_PERMUTATIONS.
 */
export function getSliderMax(
    currentGroups: number,
    currentMarketsPerGroup: number,
    adjustField: "groups" | "marketsPerGroup",
): number {
    if (adjustField === "groups") {
        if (currentMarketsPerGroup === 0) return 5;
        // groups * marketsPerGroup * 3 (worst case outcomes) <= 15
        // groups <= 15 / (marketsPerGroup * 3)
        return Math.min(5, Math.floor(MAX_PERMUTATIONS / (currentMarketsPerGroup * 3)));
    } else {
        if (currentGroups === 0) return 3;
        // groups * marketsPerGroup * 3 <= 15
        // marketsPerGroup <= 15 / (groups * 3)
        return Math.min(3, Math.floor(MAX_PERMUTATIONS / (currentGroups * 3)));
    }
}

/**
 * Compute the exact permutation count for a given config,
 * given actual market data (each market may have 2 or 3 outcomes).
 */
export function estimatePermutations(
    selectedMarkets: RankedMarket[][],
): number {
    let total = 1;
    for (const group of selectedMarkets) {
        for (const market of group) {
            total *= market.outcomeCount;
            if (total > MAX_PERMUTATIONS) return total; // early exit
        }
    }
    return total;
}
