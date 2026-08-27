/**
 * Typed GraphQL queries for the Stake.com API.
 * Updated for the current Stake GraphQL schema (2025+).
 * @module lib/stake-api/queries
 */

import { executeQuery } from "./client";
import type {
  StakeFixture,
  StakeGroupWithMarkets,
  StakeSportGroup,
} from "@/lib/contracts/api.contract";
import type { BetHistoryEntry } from "./types";

// ─── Sport ID Cache ────────────────────────────────────────────────────────

const sportIdCache = new Map<string, string>();

/**
 * Fetch the list of sports and cache slug → id mappings.
 */
async function ensureSportIdCache(): Promise<void> {
  if (sportIdCache.size > 0) return;

  const query = `
    query SportList {
      sportList {
        id
        name
        slug
      }
    }
  `;

  const data = await executeQuery<{ sportList: Array<{ id: string; name: string; slug: string }> }>({
    query,
    operationName: "SportList",
    operationType: "query",
  });

  for (const sport of data.sportList) {
    sportIdCache.set(sport.slug, sport.id);
  }
}

// ─── a) getBalance ──────────────────────────────────────────────────────────

export interface BalanceData {
  currency: string;
  amount: number;
}

/**
 * Fetch user balances by currency.
 */
export async function getBalanceQuery(available = true, vault = false): Promise<BalanceData[]> {
  const query = `
    query StakeBalances($available: Boolean, $vault: Boolean) {
      user {
        balances(available: $available, vault: $vault) {
          currency
          available
          vault
          activeBonus
        }
      }
    }
  `;

  const data = await executeQuery<{
    user: {
      balances: Array<{
        currency: string;
        available: string;
        vault: string;
        activeBonus: string;
      }>;
    };
  }>({
    query,
    variables: { available, vault },
    operationName: "StakeBalances",
    operationType: "query",
  });

  return data.user.balances.map((b) => ({
    currency: b.currency,
    amount: parseFloat(b.available) || 0,
  }));
}

// ─── b) getSportIndex ───────────────────────────────────────────────────────

export interface SportIndexData {
  sport: {
    id: string;
    name: string;
    slug: string;
    categories: Array<{
      id: string;
      name: string;
      slug: string;
      sport: { id: string; name: string; slug: string };
      tournaments: Array<{
        id: string;
        name: string;
        slug: string;
        category: { id: string; name: string; slug: string; sport: { id: string; name: string; slug: string } };
        fixtures: StakeFixture[];
      }>;
    }>;
  };
}

/**
 * Fetch the sport index — the primary discovery query.
 * Uses the current Stake API: sport(sportId) → categoryList → tournamentList → fixtureList
 */
export async function getSportIndex(
  sport: string,
  _group: string,
  _type = "popular",
  _marketLimit = 1,
): Promise<SportIndexData> {
  await ensureSportIdCache();

  const sportId = sportIdCache.get(sport);
  if (!sportId) {
    throw new Error(`Unknown sport slug: ${sport}`);
  }

  const query = `
    query SportDiscovery($sportId: String!) {
      sport(sportId: $sportId) {
        id
        name
        slug
        categoryList {
          id
          name
          slug
          tournamentList {
            id
            name
            slug
            fixtureList {
              id
              name
              slug
              status
              marketCount
              data {
                ... on SportFixtureDataMatch {
                  __typename
                  startTime
                  isOutright
                  competitors {
                    name
                    defaultName
                    extId
                    countryCode
                    abbreviation
                    iconPath
                    country
                  }
                  teams {
                    extId
                    name
                    qualifier
                  }
                }
                ... on SportFixtureDataOutright {
                  __typename
                  name
                  startTime
                  endTime
                  isOutright
                }
              }
              eventStatus {
                ... on SportFixtureEventStatusData {
                  matchStatus
                  homeScore
                  awayScore
                  homeGameScore
                  awayGameScore
                  clock {
                    matchTime
                    remainingTime
                    stopped
                  }
                  periodScores {
                    homeScore
                    awayScore
                    matchStatus
                  }
                  statistic {
                    corners { home away }
                    yellowCards { home away }
                    redCards { home away }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await executeQuery<{
    sport: {
      id: string;
      name: string;
      slug: string;
      categoryList: Array<{
        id: string;
        name: string;
        slug: string;
        tournamentList: Array<{
          id: string;
          name: string;
          slug: string;
          fixtureList: StakeFixture[];
        }>;
      }>;
    };
  }>({
    query,
    variables: { sportId },
    operationName: "SportDiscovery",
    operationType: "query",
  });

  // Transform to match the expected SportIndexData structure
  const sportRef = { id: data.sport.id, name: data.sport.name, slug: data.sport.slug };

  const categories = data.sport.categoryList.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    sport: sportRef,
    tournaments: cat.tournamentList.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      category: { id: cat.id, name: cat.name, slug: cat.slug, sport: sportRef },
      fixtures: t.fixtureList,
    })),
  }));

  return { sport: { ...sportRef, categories } };
}

// ─── c) getFixtureDetails ───────────────────────────────────────────────────

export interface FixtureDetailsData {
  fixture: StakeFixture;
  marketGroups: StakeGroupWithMarkets[];
}

/**
 * Fetch full fixture details with markets and outcomes.
 * Uses the sport(sportId) → categoryList → tournamentList → fixtureList → markets query.
 * Requires authentication.
 */
export async function getFixtureDetailsQuery(
  fixtureId: string,
  _groups: string[],
): Promise<FixtureDetailsData> {
  // We need to find the fixture by ID across all sports
  // First, get the sport list to find which sport this fixture belongs to
  await ensureSportIdCache();

  // Try each sport until we find the fixture
  for (const [slug, sportId] of sportIdCache) {
    try {
      const result = await queryFixtureFromSport(sportId, fixtureId);
      if (result) return result;
    } catch {
      continue;
    }
  }

  throw new Error(`Fixture not found: ${fixtureId}`);
}

async function queryFixtureFromSport(
  sportId: string,
  fixtureId: string,
): Promise<FixtureDetailsData | null> {
  const query = `
    query FixtureDetails($sportId: String!) {
      sport(sportId: $sportId) {
        categoryList {
          tournamentList {
            fixtureList {
              id
              name
              slug
              status
              marketCount
              data {
                ... on SportFixtureDataMatch {
                  __typename
                  startTime
                  isOutright
                  competitors {
                    name
                    defaultName
                    extId
                    countryCode
                    abbreviation
                    iconPath
                    country
                  }
                  teams {
                    extId
                    name
                    qualifier
                  }
                }
                ... on SportFixtureDataOutright {
                  __typename
                  name
                  startTime
                  endTime
                  isOutright
                }
              }
              eventStatus {
                ... on SportFixtureEventStatusData {
                  matchStatus
                  homeScore
                  awayScore
                  homeGameScore
                  awayGameScore
                  clock {
                    matchTime
                    remainingTime
                    stopped
                  }
                  periodScores {
                    homeScore
                    awayScore
                    matchStatus
                  }
                  statistic {
                    corners { home away }
                    yellowCards { home away }
                    redCards { home away }
                  }
                }
              }
              markets {
                id
                name
                status
                extId
                specifiers
                customBetAvailable
                provider
                templateExtId
                outcomes {
                  id
                  active
                  odds
                  name
                  customBetAvailable
                  extId
                }
              }
              tournament {
                id
                name
                slug
                category {
                  id
                  name
                  slug
                  sport {
                    id
                    name
                    slug
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await executeQuery<{
    sport: {
      categoryList: Array<{
        tournamentList: Array<{
          fixtureList: Array<StakeFixture & { markets: any[]; tournament: any }>;
        }>;
      }>;
    };
  }>({
    query,
    variables: { sportId },
    operationName: "FixtureDetails",
    operationType: "query",
  });

  // Find the fixture with matching ID
  for (const cat of data.sport.categoryList) {
    for (const t of cat.tournamentList) {
      for (const f of t.fixtureList) {
        if (f.id === fixtureId) {
          // Transform markets into marketGroups structure
          const marketGroups: StakeGroupWithMarkets[] = [{
            name: "Main",
            translation: "Main Markets",
            rank: 0,
            templates: [{
              id: "main",
              extId: "main",
              rank: 0,
              name: "Main",
              markets: f.markets || [],
            }],
          }];

          return {
            fixture: f,
            marketGroups,
          };
        }
      }
    }
  }

  return null;
}

// ─── d) getBetHistory ───────────────────────────────────────────────────────

export interface BetHistoryData {
  bets: BetHistoryEntry[];
  totalCount: number;
}

/**
 * Fetch paginated bet history.
 * NOTE: The Stake GraphQL API no longer exposes a public bet history query.
 * This returns empty data until a valid endpoint is discovered.
 */
export async function getBetHistoryQuery(
  _limit: number,
  _offset: number,
  _status?: string[],
): Promise<BetHistoryData> {
  // Bet history is not available via the current public Stake GraphQL API
  return { bets: [], totalCount: 0 };
}

// ─── e) getActiveBetCount ───────────────────────────────────────────────────

export interface ActiveBetCountData {
  count: number;
  byType: Record<string, number>;
}

/**
 * Fetch counts of active bets by type.
 * NOTE: The Stake GraphQL API no longer exposes a public activeBets query.
 * This returns zero counts until a valid endpoint is discovered.
 */
export async function getActiveBetCountQuery(): Promise<ActiveBetCountData> {
  return { count: 0, byType: {} };
}
