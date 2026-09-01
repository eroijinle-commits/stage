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
 * Merge markets that share the same name into a single logical market.
 * Operates across ALL groups — if "Match Winner" appears in Group A and Group B,
 * they are merged into one market. Markets with unique names pass through unchanged.
 * Multi-market groups produce one synthetic StakeMarket with all outcomes combined.
 */
export function mergeMarketsByName(markets: StakeMarket[]): StakeMarket[] {
    const groups = new Map<string, StakeMarket[]>();
    for (const market of markets) {
        const key = market.name.trim();
        const existing = groups.get(key);
        if (existing) {
            existing.push(market);
        } else {
            groups.set(key, [market]);
        }
    }

    const result: StakeMarket[] = [];
    for (const group of groups.values()) {
        if (group.length === 1) {
            result.push(group[0]);
        } else {
            result.push({
                id: group[0].id,
                name: group[0].name,
                status: "active",
                extId: group[0].extId,
                provider: group[0].provider,
                outcomes: group.flatMap((m) => m.outcomes),
            });
        }
    }
    return result;
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
 * Full pipeline: flatten → merge by name → filter → rank → take top N.
 * Throws if fewer qualifying markets are available than needed.
 */
export function selectTopMarkets(
    groups: StakeGroupWithMarkets[],
    config: ComputeConfig,
): RankedMarket[] {
    const allMarkets = flattenAllMarkets(groups);
    const merged = mergeMarketsByName(allMarkets);
    const ranked = filterByOutcomeCount(merged, config.maxOutcomes);
    const needed = marketsNeeded(config.slipCount, config.maxOutcomes);

    if (ranked.length < needed) {
        throw new Error(
            `Not enough qualifying markets: need ${needed} but only ${ranked.length} have ≤ ${config.maxOutcomes} active outcomes`,
        );
    }

    return ranked.slice(0, needed);
}
