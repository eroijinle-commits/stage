import type { PoolFixture } from "@/lib/betarchitect/types";

let _id = 0;

/**
 * Create a mock PoolFixture for testing.
 * Only `matchId`, `market`, `selection`, `odds`, and `sport`/`league` are
 * meaningful for rules/generator tests; other BetSelection fields are stubs.
 */
export function mockFixture(overrides: Partial<PoolFixture> = {}): PoolFixture {
  _id += 1;
  const odds = overrides.odds ?? 1.5;
  return {
    id: `fixture-${_id}`,
    fixtureSlug: `match-${_id}`,
    fixtureName: `Team A vs Team B ${_id}`,
    fixtureId: overrides.matchId ?? `match-${_id}`,
    tournamentName: overrides.league ?? "Premier League",
    marketId: `market-${_id}`,
    marketName: overrides.market ?? "Over/Under 2.5",
    outcomeId: `outcome-${_id}`,
    outcomeName: overrides.selection ?? "Over 2.5",
    odds,
    active: true,
    startTime: "2026-09-03T15:00:00Z",
    addedAt: Date.now(),
    betType: " goals",
    betTypeLine: "2.5",
    sport: overrides.sport ?? "soccer",
    stakeUrl: undefined,
    // Pool-specific fields
    matchId: overrides.matchId ?? `match-${_id}`,
    league: overrides.league ?? "Premier League",
    market: overrides.market ?? "Over/Under 2.5",
    selection: overrides.selection ?? "Over 2.5",
    impliedProbability: overrides.impliedProbability ?? 1 / odds,
    ...overrides,
  };
}

/**
 * Create multiple mock fixtures in bulk.
 */
export function mockFixtures(count: number, base: Partial<PoolFixture> = {}): PoolFixture[] {
  return Array.from({ length: count }, (_, i) => mockFixture({ ...base, id: undefined }));
}

/** Reset the internal ID counter between tests. */
export function resetIds(): void {
  _id = 0;
}
