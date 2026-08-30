import type { RankedMarket } from "./types";
import type { ComputeSlip, ComputeSelection } from "./types";
import { MAX_PERMUTATIONS } from "./types";

/**
 * Returns the total permutation count without generating them.
 * Product of outcome counts across all markets in the matrix.
 * Stops early if count exceeds MAX_PERMUTATIONS.
 */
export function estimateTotalCount(markets: RankedMarket[][]): number {
    let total = 1;
    for (const group of markets) {
        for (const market of group) {
            total *= market.outcomeCount;
            if (total > MAX_PERMUTATIONS) return total;
        }
    }
    return total;
}

/**
 * Generate all permutations as ComputeSlip objects.
 * Each permutation is one outcome per market, across all groups.
 * With the 15-cap, safe to materialize fully in memory.
 *
 * Each slip gets a deterministic ID based on its outcome indices.
 */
export function generateAllPermutations(matrix: RankedMarket[][]): ComputeSlip[] {
    if (matrix.length === 0 || matrix.some((g) => g.length === 0)) {
        return [];
    }

    // Flatten the matrix into a list of markets (preserving group order)
    const flatMarkets: Array<{ market: RankedMarket; groupIndex: number }> = [];
    for (let g = 0; g < matrix.length; g++) {
        for (const market of matrix[g]) {
            flatMarkets.push({ market, groupIndex: g });
        }
    }

    if (flatMarkets.length === 0) return [];

    // Build arrays of active outcomes per market
    const outcomeArrays = flatMarkets.map(({ market }) =>
        market.market.outcomes.filter((o) => o.active),
    );

    // Early exit if any market has 0 active outcomes (shouldn't happen after filtering, but safe)
    if (outcomeArrays.some((arr) => arr.length === 0)) return [];

    // Generate Cartesian product iteratively
    const slips: ComputeSlip[] = [];
    const totalPerms = estimateTotalCount(matrix);

    // Use index-based iteration for deterministic IDs
    const indices = new Array(flatMarkets.length).fill(0);

    for (let permIdx = 0; permIdx < totalPerms; permIdx++) {
        // Build selections for this permutation
        const selections: ComputeSelection[] = [];
        let combinedOdds = 1;

        for (let m = 0; m < flatMarkets.length; m++) {
            const { market: rm, groupIndex } = flatMarkets[m];
            const outcome = outcomeArrays[m][indices[m]];
            combinedOdds *= outcome.odds;

            selections.push({
                marketId: rm.market.id,
                marketName: rm.market.name,
                outcomeId: outcome.id,
                outcomeName: outcome.name,
                odds: outcome.odds,
                groupName: rm.groupName,
            });
        }

        // Deterministic ID: encode the outcome indices as a compact string
        const id = `slip-${permIdx}-${indices.join("-")}`;

        slips.push({
            id,
            selections,
            totalCombinedOdds: combinedOdds,
        });

        // Increment indices (odometer style)
        for (let m = flatMarkets.length - 1; m >= 0; m--) {
            indices[m]++;
            if (indices[m] < outcomeArrays[m].length) break;
            indices[m] = 0;
        }
    }

    return slips;
}
