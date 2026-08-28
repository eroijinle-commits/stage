/**
 * Typed GraphQL queries for the Stake.com API.
 * Updated for the current Stake GraphQL schema (2025+).
 * @module lib/stake-api/queries
 */

import { executeQuery } from "./client";
import type {
  StakeFixture,
  StakeGroupWithMarkets,
  StakeMarket,
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
  /** All available group names for this fixture (from the API's `groups` field). */
  groups?: Array<{ name: string; translation: string }>;
}

/**
 * Fetch full fixture details with markets and outcomes.
 * Uses the Stake slugFixture query: slugFixture(fixture: $slug) → groups → templates → markets.
 *
 * Auto-discovers the correct group names from the API instead of guessing:
 * 1. First call with hint groups (or ["main"]) to get the full list of available group names
 * 2. Second call with those actual group names to get complete market data
 *
 * @param fixtureSlug - The fixture slug (e.g. "46818357-bournemouth-everton")
 * @param groups - Optional hint groups; if omitted or empty, uses ["main"] for discovery
 */
export async function getFixtureDetailsQuery(
  fixtureSlug: string,
  groups?: string[],
): Promise<FixtureDetailsData> {
  const hintGroups = groups && groups.length > 0 ? groups : ["main"];

  // Phase 1: Discover available group names from the API itself.
  // The query always returns `groups { name translation }` — all available groups —
  // regardless of which groups we filter with.
  const discovery = await queryFixtureBySlug(fixtureSlug, hintGroups);
  const availableGroups: string[] = discovery.groups?.map((g: { name: string; translation: string }) => g.name) ?? [];

  // If we discovered more groups than we asked for, re-fetch with all of them
  // to get complete market data.
  if (availableGroups.length > hintGroups.length) {
    const full = await queryFixtureBySlug(fixtureSlug, availableGroups);
    return full;
  }

  return discovery;
}

/**
 * Query fixture details by slug using the Stake slugFixture GraphQL query.
 * This is the same query the Stake.com website uses to load fixture market pages.
 */
async function queryFixtureBySlug(
  fixtureSlug: string,
  groups: string[],
): Promise<FixtureDetailsData> {
  const query = `
    query FixturePage_SlugFixture($fixture: String!, $groups: [String!]!) {
      slugFixture(fixture: $fixture) {
        id
        name
        slug
        status
        customBetAvailable
        liveWidgetUrl
        widgetUrl
        streamExists
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
        group: groups(groups: $groups) {
          name
          translation
          rank
          templates(includeEmpty: false) {
            id
            extId
            rank
            name
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
          }
        }
        groups {
          name
          translation
        }
      }
    }
  `;

  const data = await executeQuery<{
    slugFixture: StakeFixture & {
      group: Array<{
        name: string;
        translation: string;
        rank: number;
        templates: Array<{
          id: string;
          extId: string;
          rank: number;
          name: string;
          markets: Array<{
            id: string;
            name: string;
            status: string;
            extId: string;
            specifiers?: string;
            customBetAvailable?: boolean;
            provider: string;
            templateExtId?: string;
            outcomes: Array<{
              id: string;
              active: boolean;
              odds: number;
              name: string;
              customBetAvailable?: boolean;
              extId?: string;
            }>;
          }>;
        }>;
      }>;
      groups: Array<{ name: string; translation: string }>;
    };
  }>({
    query,
    variables: { fixture: fixtureSlug, groups },
    operationName: "FixturePage_SlugFixture",
    operationType: "query",
  });

  const fixture = data.slugFixture;
  if (!fixture) {
    throw new Error(`Fixture not found: ${fixtureSlug}`);
  }

  // Transform the group → templates → markets structure into StakeGroupWithMarkets[]
  const marketGroups: StakeGroupWithMarkets[] = (fixture.group || []).map((g) => ({
    name: g.name,
    translation: g.translation,
    rank: g.rank,
    templates: (g.templates || []).map((t) => ({
      id: t.id,
      extId: t.extId,
      rank: t.rank,
      name: t.name,
      markets: (t.markets || []).map((m): StakeMarket => ({
        id: m.id,
        name: m.name,
        status: m.status as StakeMarket["status"],
        extId: m.extId,
        specifiers: m.specifiers,
        customBetAvailable: m.customBetAvailable,
        provider: m.provider,
        templateExtId: m.templateExtId,
        outcomes: (m.outcomes || []).map((o) => ({
          __typename: "SportMarketOutcome" as const,
          id: o.id,
          active: o.active,
          odds: o.odds,
          name: o.name,
          customBetAvailable: o.customBetAvailable,
          extId: o.extId,
        })),
      })),
    })),
  }));

  // fixture.groups contains ALL available group names for this fixture
  const availableGroups = (fixture as StakeFixture & { groups?: Array<{ name: string; translation: string }> }).groups;

  return { fixture, marketGroups, groups: availableGroups };
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
