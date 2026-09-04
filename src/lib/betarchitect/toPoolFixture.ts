/**
 * scannerOutcomeToPoolFixture — converts a scanner-flagged outcome into a BetArchitect pool leg.
 * The scanner already knows the market and outcome, so this mapping is exact
 * (unlike Discovery's fixture-level fallback in FixtureRow.toPoolFixture).
 * @module lib/betarchitect/toPoolFixture
 */

import type { PoolFixture } from "./types";
import type { StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import type { FlaggedMarket } from "@/lib/scanner/types";

/**
 * Build a PoolFixture from a scanner result. Returns null when the outcome ID
 * is empty — generators and bet placement require real outcome IDs.
 *
 * The `id` scheme matches Discovery's (`pool-{fixtureId}-{marketId}-{outcomeId}`)
 * so cross-source dedup in `useSlipStore.addToPool` works.
 */
export function scannerOutcomeToPoolFixture(
  fixture: DiscoveryFixture,
  flagged: FlaggedMarket,
  outcome: StakeMarketOutcome,
): PoolFixture | null {
  if (!outcome.id || outcome.id.trim() === "") return null;

  return {
    id: `pool-${fixture.id}-${flagged.market.id}-${outcome.id}`,
    fixtureSlug: fixture.slug,
    fixtureName: fixture.name,
    fixtureId: fixture.id,
    tournamentName: fixture.tournament.name,
    marketId: flagged.market.id,
    marketName: flagged.market.name,
    outcomeId: outcome.id,
    outcomeName: outcome.name,
    odds: outcome.odds,
    active: outcome.active,
    startTime: fixture.startTime,
    addedAt: Date.now(),
    betType: "value-scanner",
    betTypeLine: null,
    sport: fixture.sport || "soccer",
    stakeUrl: fixture.stakeUrl,
    matchId: fixture.id,
    league: fixture.tournament.name,
    market: flagged.market.name,
    selection: outcome.name,
    impliedProbability: 1 / outcome.odds,
    allOutcomes: flagged.market.outcomes.map((o) => ({
      name: o.name,
      odds: o.odds,
      active: o.active,
    })),
    source: "value-scanner",
    gapRatio: flagged.gapRatio,
    gapMinOdds: flagged.minOdds,
    gapMaxOdds: flagged.maxOdds,
  };
}
