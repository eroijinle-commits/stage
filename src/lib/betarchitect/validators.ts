import type { PoolFixture } from "./types";

/**
 * Check if any two legs share the same match.
 * Hard rule — generators must never produce this.
 */
export function hasSameMatch(legs: PoolFixture[]): boolean {
  const matchIds = legs.map((l) => l.matchId);
  return new Set(matchIds).size !== matchIds.length;
}

/**
 * Check if any two legs from the same match target the same market
 * (e.g. Over 2.5 + Under 2.5 on the same fixture).
 * Hard rule — generators must never produce this.
 */
export function hasMutuallyExclusiveLegs(legs: PoolFixture[]): boolean {
  const byMatch = groupByMatch(legs);
  for (const [, group] of byMatch) {
    const markets = new Set(group.map((l) => l.market));
    if (markets.size < group.length) return true;
  }
  return false;
}

/**
 * Group legs by their match ID.
 */
export function groupByMatch(legs: PoolFixture[]): Map<string, PoolFixture[]> {
  const map = new Map<string, PoolFixture[]>();
  for (const leg of legs) {
    const arr = map.get(leg.matchId) ?? [];
    arr.push(leg);
    map.set(leg.matchId, arr);
  }
  return map;
}
