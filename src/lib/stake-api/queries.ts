/**
 * Typed GraphQL queries for the Stake.com API.
 * Each query includes full TypeScript interfaces for its response.
 * @module lib/stake-api/queries
 */

import { executeQuery } from "./client";
import type {
    StakeFixture,
    StakeGroupWithMarkets,
    StakeSportGroup,
} from "@/lib/contracts/api.contract";
import type { BetHistoryEntry } from "./types";

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
 * Returns tournaments, fixtures, categories, and market previews.
 */
export async function getSportIndex(
    sport: string,
    group: string,
    type = "popular",
    marketLimit = 1,
): Promise<SportIndexData> {
    const query = `
    query SportIndex($sport: String!, $group: String!, $type: String!, $marketLimit: Int!) {
      sportIndex(sport: $sport, group: $group, type: $type, marketLimit: $marketLimit) {
        id
        name
        slug
        categories {
          id
          name
          slug
          sport {
            id
            name
            slug
          }
          tournaments {
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
            fixtures {
              id
              name
              slug
              status
              provider
              stakeFixtureId
              extId
              marketCount
              liveWidgetUrl
              widgetUrl
              streamExists
              customBetAvailable
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
              tournament {
                id
                name
                slug
                category {
                  id
                  name
                  slug
                }
              }
              eventStatus {
                matchStatus
                homeScore
                awayScore
                clock {
                  matchTime
                  remainingTime
                  stopped
                }
              }
            }
          }
        }
      }
    }
  `;

    const data = await executeQuery<{ sportIndex: SportIndexData["sport"] }>({
        query,
        variables: { sport, group, type, marketLimit },
        operationName: "SportIndex",
        operationType: "query",
    });

    return { sport: data.sportIndex };
}

// ─── c) getFixtureDetails ───────────────────────────────────────────────────

export interface FixtureDetailsData {
    fixture: StakeFixture;
    marketGroups: StakeGroupWithMarkets[];
}

/**
 * Fetch full fixture details with all market groups, templates, markets, and outcomes.
 */
export async function getFixtureDetailsQuery(
    fixtureSlug: string,
    groups: string[],
): Promise<FixtureDetailsData> {
    const query = `
    query FixturePage_SlugFixture($slug: String!, $groups: [String!]!) {
      fixturePage(slug: $slug) {
        fixture {
          id
          name
          slug
          status
          provider
          stakeFixtureId
          extId
          marketCount
          liveWidgetUrl
          widgetUrl
          streamExists
          customBetAvailable
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
          eventStatus {
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
        marketGroups(groups: $groups) {
          name
          translation
          rank
          templates {
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
      }
    }
  `;

    const data = await executeQuery<{ fixturePage: FixtureDetailsData }>({
        query,
        variables: { slug: fixtureSlug, groups },
        operationName: "FixturePage_SlugFixture",
        operationType: "query",
    });

    return data.fixturePage;
}

// ─── d) getFixtureGroups ────────────────────────────────────────────────────

export interface FixtureGroupsData {
    groups: StakeSportGroup[];
}

/**
 * Fetch available market groups for a fixture.
 */
export async function getFixtureGroupsQuery(fixtureSlug: string): Promise<FixtureGroupsData> {
    const query = `
    query FixtureIndexGroups($slug: String!) {
      fixtureIndex(slug: $slug) {
        groups {
          name
          translation
          rank
        }
      }
    }
  `;

    const data = await executeQuery<{ fixtureIndex: { groups: StakeSportGroup[] } }>({
        query,
        variables: { slug: fixtureSlug },
        operationName: "FixtureIndexGroups",
        operationType: "query",
    });

    return { groups: data.fixtureIndex.groups };
}

// ─── e) getBetHistory ───────────────────────────────────────────────────────

export interface BetHistoryData {
    bets: BetHistoryEntry[];
    totalCount: number;
}

/**
 * Fetch paginated bet history with full details.
 */
export async function getBetHistoryQuery(
    limit: number,
    offset: number,
    status?: string[],
): Promise<BetHistoryData> {
    const query = `
    query SportSportList($limit: Int!, $offset: Int!, $status: [String!]) {
      sportList(limit: $limit, offset: $offset, status: $status) {
        bets {
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
            market { name }
            fixture { name slug }
            result
            status
          }
        }
        totalCount
      }
    }
  `;

    const data = await executeQuery<{ sportList: BetHistoryData }>({
        query,
        variables: { limit, offset, status: status ?? [] },
        operationName: "SportSportList",
        operationType: "query",
    });

    return data.sportList;
}

// ─── f) getActiveBetCount ───────────────────────────────────────────────────

export interface ActiveBetCountData {
    count: number;
    byType: Record<string, number>;
}

/**
 * Fetch counts of active bets by type.
 */
export async function getActiveBetCountQuery(): Promise<ActiveBetCountData> {
    const query = `
    query ActiveBetCount_User {
      activeBets {
        count
        byType
      }
    }
  `;

    const data = await executeQuery<{ activeBets: ActiveBetCountData }>({
        query,
        operationName: "ActiveBetCount_User",
        operationType: "query",
    });

    return data.activeBets;
}
