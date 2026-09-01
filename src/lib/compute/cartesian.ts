import type { RankedMarket } from "./types";
import type { ComputeSlip, ComputeSelection } from "./types";

/**
 * Returns the total permutation count without generating them.
 * Product of outcome counts across a flat array of markets.
 */
export function estimateTotalCount(markets: RankedMarket[]): number {
    let total = 1;
    for (const market of markets) {
        total *= market.outcomeCount;
    }
    return total;
}

/**
 * Generate all permutations as ComputeSlip objects from a flat array.
 * Each permutation is one outcome per market, producing exactly
 * product(outcomeCount) slips.
 *
 * Each slip gets a deterministic ID based on its outcome indices.
 */
export function generateAllPermutations(markets: RankedMarket[]): ComputeSlip[] {
    if (markets.length === 0) return [];

    // Build arrays of active outcomes per market
    const outcomeArrays = markets.map((m) =>
        m.market.outcomes.filter((o) => o.active),
    );

    // Early exit if any market has 0 active outcomes
    if (outcomeArrays.some((arr) => arr.length === 0)) return [];

    // Total permutations
    const totalPerms = estimateTotalCount(markets);
    if (totalPerms === 0) return [];

    // Generate Cartesian product iteratively
    const slips: ComputeSlip[] = [];
    const indices = new Array(markets.length).fill(0);

    for (let permIdx = 0; permIdx < totalPerms; permIdx++) {
        // Build selections for this permutation
        const selections: ComputeSelection[] = [];
        let combinedOdds = 1;

        for (let m = 0; m < markets.length; m++) {
            const rm = markets[m];
            const outcome = outcomeArrays[m][indices[m]];
            combinedOdds *= outcome.odds;

            selections.push({
                marketId: rm.market.id,
                marketName: rm.market.name,
                outcomeId: outcome.id,
                outcomeName: outcome.name,
                odds: outcome.odds,
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
        for (let m = markets.length - 1; m >= 0; m--) {
            indices[m]++;
            if (indices[m] < outcomeArrays[m].length) break;
            indices[m] = 0;
        }
    }

    return slips;
}
