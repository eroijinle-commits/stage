import type { StakeGroupWithMarkets, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { RankedMarket, ComputeConfig } from "./types";
import { marketsNeeded } from "./types";

/**
 * Count active outcomes in a market.
 */
function activeOutcomeCount(market: StakeMarket): number {
    return market.outcomes.filter((o: StakeMarketOutcome) => o.active).length;
}

/**
 * Flatten all markets from all groups and their templates into a single array.
 */
export function flattenAllMarkets(
    groups: StakeGroupWithMarkets[],
): StakeMarket[] {
    return groups.flatMap((g) =>
        g.templates.flatMap((t) => t.markets),
    );
}

/**
 * Filter markets to those with at most `maxOutcomes` active outcomes,
 * then rank by highest active outcome odds descending.
 * Returns RankedMarket[] sorted by highestOdds desc.
 */
export function filterByOutcomeCount(
    markets: StakeMarket[],
    maxOutcomes: number,
): RankedMarket[] {
    const ranked: RankedMarket[] = [];
    for (const market of markets) {
        const active = market.outcomes.filter((o: StakeMarketOutcome) => o.active);
        if (active.length === 0 || active.length > maxOutcomes) continue;
        const highestOdds = Math.max(...active.map((o) => o.odds));
        ranked.push({
            market,
            highestOdds,
            outcomeCount: active.length,
        });
    }
    return ranked.sort((a, b) => b.highestOdds - a.highestOdds);
}

/**
 * Full pipeline: flatten → filter → rank → take top N.
 * Throws if fewer qualifying markets are available than needed.
 */
export function selectTopMarkets(
    groups: StakeGroupWithMarkets[],
    config: ComputeConfig,
): RankedMarket[] {
    const allMarkets = flattenAllMarkets(groups);
    const ranked = filterByOutcomeCount(allMarkets, config.maxOutcomes);
    const needed = marketsNeeded(config.slipCount, config.maxOutcomes);

    if (ranked.length < needed) {
        throw new Error(
            `Not enough qualifying markets: need ${needed} but only ${ranked.length} have ≤ ${config.maxOutcomes} active outcomes`,
        );
    }

    return ranked.slice(0, needed);
}
