import type { StakeGroupWithMarkets, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { RankedGroup, RankedMarket, ComputeConfig } from "./types";

/**
 * Compute the average odds of a market based on its active outcomes.
 * If no outcomes are active, returns 0.
 */
function avgOddsForMarket(market: StakeMarket): number {
    const active = market.outcomes.filter((o: StakeMarketOutcome) => o.active);
    if (active.length === 0) return 0;
    const sum = active.reduce((acc: number, o: StakeMarketOutcome) => acc + o.odds, 0);
    return sum / active.length;
}

/**
 * Count active outcomes in a market.
 */
function activeOutcomeCount(market: StakeMarket): number {
    return market.outcomes.filter((o: StakeMarketOutcome) => o.active).length;
}

/**
 * Rank groups by their average odds (descending).
 * avgOdds(group) = sum(avgOdds(market) for market in group) / count(markets in group)
 * Only considers markets with at least 1 active outcome.
 */
export function rankGroupsByOdds(
    groups: StakeGroupWithMarkets[],
): RankedGroup[] {
    const ranked: RankedGroup[] = groups.map((g) => {
        const allMarkets: StakeMarket[] = g.templates.flatMap((t) => t.markets);

        const markets: RankedMarket[] = allMarkets
            .map((market) => ({
                market,
                groupName: g.name,
                avgOdds: avgOddsForMarket(market),
                outcomeCount: activeOutcomeCount(market),
            }))
            .filter((rm) => rm.outcomeCount > 0); // exclude markets with no active outcomes

        return {
            groupName: g.name,
            groupTranslation: g.translation,
            markets: markets.sort((a, b) => b.avgOdds - a.avgOdds),
        };
    });

    // Sort groups by their average odds (avg of all market avgOdds in the group)
    return ranked.sort((a, b) => {
        const avgA = a.markets.length > 0
            ? a.markets.reduce((acc, m) => acc + m.avgOdds, 0) / a.markets.length
            : 0;
        const avgB = b.markets.length > 0
            ? b.markets.reduce((acc, m) => acc + m.avgOdds, 0) / b.markets.length
            : 0;
        return avgB - avgA;
    });
}

/**
 * Take the top N groups from a ranked list.
 * If fewer groups are available than maxGroups, returns all available.
 */
export function selectTopGroups(
    groups: RankedGroup[],
    maxGroups: number,
): RankedGroup[] {
    return groups.slice(0, maxGroups);
}

/**
 * Within a group, rank markets by average outcome odds (descending)
 * and take the top N.
 * Markets with 0 active outcomes are already filtered out by rankGroupsByOdds.
 */
export function rankMarketsInGroup(
    group: RankedGroup,
    maxMarkets: number,
): RankedGroup {
    return {
        ...group,
        markets: group.markets.slice(0, maxMarkets),
    };
}

/**
 * Build the filtered matrix of markets ready for Cartesian product.
 * Returns a 2D array: outer = groups, inner = markets within that group.
 */
export function buildFilteredMatrix(
    groups: RankedGroup[],
    config: ComputeConfig,
): RankedMarket[][] {
    const topGroups = selectTopGroups(groups, config.groups);
    return topGroups.map((group) => {
        const ranked = rankMarketsInGroup(group, config.marketsPerGroup);
        return ranked.markets;
    });
}
