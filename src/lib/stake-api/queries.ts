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
    query StakeBalances {
      user {
        balances {
          available {
            amount
            currency
          }
          vault {
            amount
            currency
          }
        }
      }
    }
  `;

  const data = await executeQuery<{
    user: {
      balances: Array<{
        available: { amount: number; currency: string };
        vault: { amount: number; currency: string };
      }>;
    };
  }>({
    query,
    operationName: "StakeBalances",
    operationType: "query",
  });

  return data.user.balances
    .filter((b) => {
      if (available) return b.available.amount > 0;
      return true;
    })
    .map((b) => ({
      currency: b.available.currency,
      amount: b.available.amount || 0,
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
 * Fetch a single fixture by ID with markets using a direct query.
 * Much faster than scanning the full sport tree.
 */
async function getFixtureByIdDirect(fixtureId: string): Promise<FixtureDetailsData | null> {
  const query = `
    query FixtureById($fixtureId: String!) {
      fixture(fixtureId: $fixtureId) {
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
  `;

  try {
    const data = await executeQuery<{
      fixture: StakeFixture & { markets: any[]; tournament: any };
    }>({
      query,
      variables: { fixtureId },
      operationName: "FixtureById",
      operationType: "query",
    });

    if (!data.fixture) return null;

    const f = data.fixture;
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

    return { fixture: f, marketGroups };
  } catch {
    return null;
  }
}

/**
 * Fetch full fixture details with markets and outcomes.
 * Tries direct query first, falls back to sport tree scan.
 */
export async function getFixtureDetailsQuery(
  fixtureId: string,
  _groups: string[],
  sportSlug?: string,
): Promise<FixtureDetailsData> {
  await ensureSportIdCache();

  // Fast path: direct query by fixture ID
  const direct = await getFixtureByIdDirect(fixtureId);
  if (direct) return direct;

  // If sport slug is known, query only that sport
  if (sportSlug) {
    const sportId = sportIdCache.get(sportSlug);
    if (sportId) {
      const result = await queryFixtureFromSport(sportId, fixtureId);
      if (result) return result;
    }
  }

  // Fallback: try each sport until we find the fixture
  for (const [slug, sid] of sportIdCache) {
    if (sportSlug && slug === sportSlug) continue;
    try {
      const result = await queryFixtureFromSport(sid, fixtureId);
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
 * Fetch paginated bet history from the Stake API.
 * Uses the user's sportBetHistory query. Requires authentication.
 * Falls back to empty data if the query is unavailable (e.g. API version mismatch).
 */
export async function getBetHistoryQuery(
  limit: number,
  offset: number,
  status?: string[],
): Promise<BetHistoryData> {
  const query = `
    query StakeBetHistory($limit: Int!, $offset: Int!, $status: [SportBetStatusEnum!]) {
      user {
        sportBetHistory(limit: $limit, offset: $offset, status: $status) {
          id
          amount
          currency
          status
          betType
          payoutMultiplier
          potentialMultiplier
          totalOdds
          stakePerLeg
          createdAt
          settledAt
          outcomes {
            id
            name
            odds
            market {
              name
            }
            fixture {
              name
              slug
            }
            result
            status
          }
        }
        sportBetCount(status: $status)
      }
    }
  `;

  try {
    const data = await executeQuery<{
      user: {
        sportBetHistory: Array<{
          id: string;
          amount: number;
          currency: string;
          status: string;
          betType: string;
          payoutMultiplier: number | null;
          potentialMultiplier: number;
          totalOdds: number;
          stakePerLeg: number | null;
          createdAt: number;
          settledAt: number | null;
          outcomes: Array<{
            id: string;
            name: string;
            odds: number;
            market: { name: string };
            fixture: { name: string; slug: string };
            result: string | null;
            status: string;
          }>;
        }>;
        sportBetCount: number;
      };
    }>({
      query,
      variables: { limit, offset, status: status ?? null },
      operationName: "StakeBetHistory",
      operationType: "query",
    });

    const bets: BetHistoryEntry[] = (data.user?.sportBetHistory ?? []).map((b) => ({
      id: b.id,
      amount: b.amount,
      currency: b.currency,
      status: b.status,
      betType: b.betType,
      payoutMultiplier: b.payoutMultiplier,
      potentialMultiplier: b.potentialMultiplier,
      totalOdds: b.totalOdds,
      stakePerLeg: b.stakePerLeg,
      createdAt: b.createdAt,
      settledAt: b.settledAt,
      outcomes: b.outcomes.map((o) => ({
        id: o.id,
        name: o.name,
        odds: o.odds,
        market: { name: o.market.name },
        fixture: { name: o.fixture.name, slug: o.fixture.slug },
        result: o.result,
        status: o.status,
      })),
    }));

    return {
      bets,
      totalCount: data.user?.sportBetCount ?? bets.length,
    };
  } catch {
    // If the query fails (e.g. API doesn't support this endpoint yet),
    // return empty — the local DB is the fallback source of truth
    return { bets: [], totalCount: 0 };
  }
}

// ─── e) getActiveBetCount ───────────────────────────────────────────────────

export interface ActiveBetCountData {
  count: number;
  byType: Record<string, number>;
}

/**
 * Fetch counts of active bets by type from the Stake API.
 * Falls back to zero counts if the query is unavailable.
 */
export async function getActiveBetCountQuery(): Promise<ActiveBetCountData> {
  const query = `
    query StakeActiveBetCount {
      user {
        activeBetCount
        activeBetsByType {
          type
          count
        }
      }
    }
  `;

  try {
    const data = await executeQuery<{
      user: {
        activeBetCount: number;
        activeBetsByType: Array<{ type: string; count: number }>;
      };
    }>({
      query,
      operationName: "StakeActiveBetCount",
      operationType: "query",
    });

    const byType: Record<string, number> = {};
    for (const entry of data.user?.activeBetsByType ?? []) {
      byType[entry.type] = entry.count;
    }

    return {
      count: data.user?.activeBetCount ?? 0,
      byType,
    };
  } catch {
    return { count: 0, byType: {} };
  }
}
