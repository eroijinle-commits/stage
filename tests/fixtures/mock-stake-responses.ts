/**
 * Mock Stake API responses for testing.
 * @module tests/fixtures/mock-stake-responses
 */

import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { StakeFixture } from "@/lib/contracts/api.contract";

// ─── Balance ────────────────────────────────────────────────────────────────

export const mockBalanceResponse = {
  data: {
    user: {
      balances: [
        { currency: "NGN", available: "50000", vault: "10000", activeBonus: "0" },
        { currency: "BTC", available: "0.0012", vault: "0", activeBonus: "0" },
      ],
    },
  },
};

export const mockBalanceEmpty = {
  data: {
    user: {
      balances: [],
    },
  },
};

// ─── Sport List (for ensureSportIdCache) ───────────────────────────────────

export const mockSportListResponse = {
  data: {
    sportList: [
      { id: "1", name: "Football", slug: "football" },
      { id: "2", name: "Tennis", slug: "tennis" },
      { id: "3", name: "Cricket", slug: "cricket" },
    ],
  },
};

// ─── Sport Index ────────────────────────────────────────────────────────────
// This mirrors the raw GraphQL response structure that getSportIndex receives
// (sport → categoryList → tournamentList → fixtureList).

export const mockSportIndexResponse = {
  data: {
    sport: {
      id: "1",
      name: "Football",
      slug: "football",
      categoryList: [
        {
          id: "10",
          name: "England",
          slug: "england",
          tournamentList: [
            {
              id: "100",
              name: "Premier League",
              slug: "premier-league",
              fixtureList: [
                {
                  id: "f1",
                  name: "Arsenal vs Chelsea",
                  slug: "arsenal-vs-chelsea",
                  status: "not_started",
                  provider: "betradar",
                  stakeFixtureId: "sf1",
                  extId: "ef1",
                  marketCount: 85,
                  liveWidgetUrl: null,
                  widgetUrl: null,
                  streamExists: false,
                  customBetAvailable: false,
                  data: {
                    __typename: "SportFixtureDataMatch" as const,
                    startTime: "2026-08-30T15:00:00Z",
                    isOutright: false,
                    competitors: [
                      {
                        name: "Arsenal",
                        defaultName: "Arsenal",
                        extId: "a1",
                        countryCode: "GB",
                        abbreviation: "ARS",
                        iconPath: null,
                        country: "England",
                      },
                      {
                        name: "Chelsea",
                        defaultName: "Chelsea",
                        extId: "a2",
                        countryCode: "GB",
                        abbreviation: "CHE",
                        iconPath: null,
                        country: "England",
                      },
                    ],
                    teams: [
                      { extId: "a1", name: "Arsenal", qualifier: "home" },
                      { extId: "a2", name: "Chelsea", qualifier: "away" },
                    ],
                  },
                  tournament: {
                    id: "100",
                    name: "Premier League",
                    slug: "premier-league",
                    category: { id: "10", name: "England", slug: "england" },
                  },
                  eventStatus: null,
                },
                {
                  id: "f2",
                  name: "Liverpool vs Man United",
                  slug: "liverpool-vs-man-united",
                  status: "in_progress",
                  provider: "betradar",
                  stakeFixtureId: "sf2",
                  extId: "ef2",
                  marketCount: 85,
                  liveWidgetUrl: null,
                  widgetUrl: null,
                  streamExists: true,
                  customBetAvailable: false,
                  data: {
                    __typename: "SportFixtureDataMatch" as const,
                    startTime: "2026-08-30T17:30:00Z",
                    isOutright: false,
                    competitors: [
                      {
                        name: "Liverpool",
                        defaultName: "Liverpool",
                        extId: "a3",
                        countryCode: "GB",
                        abbreviation: "LIV",
                        iconPath: null,
                        country: "England",
                      },
                      {
                        name: "Man United",
                        defaultName: "Man United",
                        extId: "a4",
                        countryCode: "GB",
                        abbreviation: "MUN",
                        iconPath: null,
                        country: "England",
                      },
                    ],
                    teams: [
                      { extId: "a3", name: "Liverpool", qualifier: "home" },
                      { extId: "a4", name: "Man United", qualifier: "away" },
                    ],
                  },
                  tournament: {
                    id: "100",
                    name: "Premier League",
                    slug: "premier-league",
                    category: { id: "10", name: "England", slug: "england" },
                  },
                  eventStatus: {
                    matchStatus: "2nd Half",
                    homeScore: 2,
                    awayScore: 1,
                    clock: { matchTime: "67:00", remainingTime: "23:00", stopped: false },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

// ─── Fixture Details ────────────────────────────────────────────────────────

export const mockFixtureDetailsResponse = {
  data: {
    fixturePage: {
      fixture: {
        id: "f1",
        name: "Arsenal vs Chelsea",
        slug: "arsenal-vs-chelsea",
        status: "not_started",
        provider: "betradar",
        stakeFixtureId: "sf1",
        extId: "ef1",
        marketCount: 85,
        data: {
          __typename: "SportFixtureDataMatch" as const,
          startTime: "2026-08-30T15:00:00Z",
          isOutright: false,
          competitors: [
            {
              name: "Arsenal",
              defaultName: "Arsenal",
              extId: "a1",
              countryCode: "GB",
              abbreviation: "ARS",
              iconPath: null,
              country: "England",
            },
            {
              name: "Chelsea",
              defaultName: "Chelsea",
              extId: "a2",
              countryCode: "GB",
              abbreviation: "CHE",
              iconPath: null,
              country: "England",
            },
          ],
          teams: [],
        },
        tournament: {
          id: "100",
          name: "Premier League",
          slug: "premier-league",
          category: { id: "10", name: "England", slug: "england" },
        },
        eventStatus: null,
      } as unknown as StakeFixture,
      marketGroups: [
        {
          name: "Match Winner",
          template: "1x2",
          markets: [
            {
              id: "m1",
              name: "Match Winner",
              outcomes: [
                { id: "o1", name: "Arsenal", odds: 1.85, active: true },
                { id: "o2", name: "Draw", odds: 3.5, active: true },
                { id: "o3", name: "Chelsea", odds: 4.2, active: true },
              ],
            },
          ],
        },
        {
          name: "Over/Under 2.5",
          template: "Asian Total",
          markets: [
            {
              id: "m2",
              name: "Total Goals Over/Under 2.5",
              outcomes: [
                { id: "o4", name: "Over 2.5", odds: 1.75, active: true },
                { id: "o5", name: "Under 2.5", odds: 2.1, active: true },
              ],
            },
          ],
        },
      ],
    },
  },
};

// ─── Place Bet ──────────────────────────────────────────────────────────────

export const mockPlaceBetResponse = {
  data: {
    placeBet: {
      id: "bet-001",
      amount: 1000,
      currency: "NGN",
      odds: 1.85,
      potentialMultiplier: 1.85,
      outcomes: [
        {
          id: "o1",
          odds: 1.85,
          market: { name: "Match Winner" },
          fixtureName: "Arsenal vs Chelsea",
        },
      ],
      status: "pending",
      createdAt: 1693401600000,
    },
  },
};

export const mockPlaceBetErrorResponse = {
  errors: [{ message: "Odds have changed" }],
};

// ─── Bet History ────────────────────────────────────────────────────────────

export const mockBetHistoryResponse = {
  data: {
    sportList: {
      bets: [
        {
          id: "bet-001",
          amount: 1000,
          currency: "NGN",
          status: "won",
          betType: "single",
          payoutMultiplier: 1.85,
          potentialMultiplier: 1.85,
          totalOdds: 1.85,
          stakePerLeg: 1000,
          createdAt: 1693315200000,
          settledAt: 1693401600000,
          outcomes: [
            {
              id: "o1",
              name: "Arsenal",
              odds: 1.85,
              market: { name: "Match Winner" },
              fixture: { name: "Arsenal vs Chelsea", slug: "arsenal-vs-chelsea" },
              result: "win",
              status: "won",
            },
          ],
        },
        {
          id: "bet-002",
          amount: 2000,
          currency: "NGN",
          status: "lost",
          betType: "parlay",
          payoutMultiplier: null,
          potentialMultiplier: 5.2,
          totalOdds: 5.2,
          stakePerLeg: 2000,
          createdAt: 1693228800000,
          settledAt: 1693315200000,
          outcomes: [
            {
              id: "o2",
              name: "Liverpool",
              odds: 2.1,
              market: { name: "Match Winner" },
              fixture: { name: "Liverpool vs Chelsea", slug: "liverpool-vs-chelsea" },
              result: "win",
              status: "won",
            },
            {
              id: "o3",
              name: "Over 2.5",
              odds: 2.48,
              market: { name: "Total Goals" },
              fixture: { name: "Man City vs Arsenal", slug: "man-city-vs-arsenal" },
              result: "loss",
              status: "lost",
            },
          ],
        },
      ],
      totalCount: 2,
    },
  },
};

// ─── Helper: Create BetSelection ────────────────────────────────────────────

export function createMockSelection(overrides: Partial<BetSelection> = {}): BetSelection {
  return {
    id: `sel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fixtureSlug: "arsenal-vs-chelsea",
    fixtureName: "Arsenal vs Chelsea",
    fixtureId: "f1",
    tournamentName: "Premier League",
    marketId: "m1",
    marketName: "Match Winner",
    outcomeId: "o1",
    outcomeName: "Arsenal",
    odds: 1.85,
    active: true,
    startTime: "2026-08-30T15:00:00Z",
    addedAt: Date.now(),
    betType: "match-winner",
    betTypeLine: null,
    ...overrides,
  };
}

export function createMockSelections(count: number): BetSelection[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSelection({
      id: `sel-${i + 1}`,
      outcomeId: `o${i + 1}`,
      outcomeName: `Selection ${i + 1}`,
      odds: 1.5 + i * 0.5,
    }),
  );
}

// ─── GraphQL Response Helpers ───────────────────────────────────────────────

export function graphqlSuccess<T>(data: T) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ data }),
    headers: new Headers(),
  };
}

export function graphqlError(message: string, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve({ errors: [{ message }] }),
    headers: new Headers(),
  };
}

export function networkError() {
  return Promise.reject(new TypeError("Failed to fetch"));
}

export function httpError(status: number, statusText = "Error") {
  return { ok: false, status, statusText, json: () => Promise.resolve({}), headers: new Headers() };
}
