import { describe, it, expect } from "vitest";
import { scannerOutcomeToPoolFixture } from "@/lib/betarchitect/toPoolFixture";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import type { StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { FlaggedMarket } from "@/lib/scanner/types";

function mockOutcome(overrides: Partial<StakeMarketOutcome> = {}): StakeMarketOutcome {
  return {
    __typename: "SportMarketOutcome",
    id: "outcome-1",
    name: "Over 2.5",
    odds: 6.0,
    active: true,
    ...overrides,
  };
}

function mockMarket(overcomes: StakeMarketOutcome[] = []): StakeMarket {
  return {
    id: "market-1",
    name: "Over/Under 2.5 Goals",
    outcomes: overcomes.length > 0 ? overcomes : [mockOutcome()],
  } as StakeMarket;
}

function mockFlagged(overrides: Partial<FlaggedMarket> = {}): FlaggedMarket {
  const minOutcome = mockOutcome({ id: "outcome-min", name: "Under 2.5", odds: 1.2 });
  const maxOutcome = mockOutcome({ id: "outcome-max", odds: 6.0 });
  return {
    market: mockMarket([minOutcome, maxOutcome]),
    gapRatio: 5,
    minOdds: 1.2,
    maxOdds: 6.0,
    minOutcome,
    maxOutcome,
    ...overrides,
  };
}

function mockFixture(overrides: Partial<DiscoveryFixture> = {}): DiscoveryFixture {
  return {
    id: "fixture-1",
    name: "Team A vs Team B",
    slug: "team-a-vs-team-b",
    startTime: "2026-09-05T15:00:00Z",
    status: "upcoming",
    isLive: false,
    tournament: {
      name: "Premier League",
      slug: "premier-league",
      category: { name: "England", slug: "england" },
    },
    competitors: [],
    previewMarkets: [],
    sport: "soccer",
    stakeUrl: "https://stake.com/sports/soccer/team-a-vs-team-b",
    ...overrides,
  } as DiscoveryFixture;
}

describe("scannerOutcomeToPoolFixture", () => {
  it("maps all base fields from fixture, market, and outcome", () => {
    const fixture = mockFixture();
    const flagged = mockFlagged();
    const outcome = mockOutcome({ id: "outcome-max", odds: 6.0 });

    const pool = scannerOutcomeToPoolFixture(fixture, flagged, outcome);

    expect(pool).not.toBeNull();
    expect(pool!.fixtureId).toBe("fixture-1");
    expect(pool!.fixtureName).toBe("Team A vs Team B");
    expect(pool!.tournamentName).toBe("Premier League");
    expect(pool!.marketId).toBe("market-1");
    expect(pool!.marketName).toBe("Over/Under 2.5 Goals");
    expect(pool!.outcomeId).toBe("outcome-max");
    expect(pool!.outcomeName).toBe("Over 2.5");
    expect(pool!.odds).toBe(6.0);
    expect(pool!.sport).toBe("soccer");
    expect(pool!.stakeUrl).toBe("https://stake.com/sports/soccer/team-a-vs-team-b");
  });

  it("sets the id to the shared pool-{fixtureId}-{marketId}-{outcomeId} scheme", () => {
    const pool = scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome());
    expect(pool!.id).toBe("pool-fixture-1-market-1-outcome-1");
  });

  it("sets convenience aliases", () => {
    const pool = scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome());
    expect(pool!.matchId).toBe("fixture-1");
    expect(pool!.league).toBe("Premier League");
    expect(pool!.market).toBe("Over/Under 2.5 Goals");
    expect(pool!.selection).toBe("Over 2.5");
  });

  it("derives impliedProbability as 1 / odds", () => {
    const pool = scannerOutcomeToPoolFixture(
      mockFixture(),
      mockFlagged(),
      mockOutcome({ odds: 4 }),
    );
    expect(pool!.impliedProbability).toBeCloseTo(0.25);
  });

  it("populates allOutcomes from the flagged market", () => {
    const pool = scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome());
    expect(pool!.allOutcomes).toHaveLength(2);
    expect(pool!.allOutcomes![0]).toEqual({ name: "Under 2.5", odds: 1.2, active: true });
  });

  it("tags the leg as scanner-sourced and carries gap metadata", () => {
    const pool = scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome());
    expect(pool!.source).toBe("value-scanner");
    expect(pool!.gapRatio).toBe(5);
    expect(pool!.gapMinOdds).toBe(1.2);
    expect(pool!.gapMaxOdds).toBe(6.0);
  });

  it("returns null when the outcome id is empty", () => {
    expect(
      scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome({ id: "" })),
    ).toBeNull();
    expect(
      scannerOutcomeToPoolFixture(mockFixture(), mockFlagged(), mockOutcome({ id: "   " })),
    ).toBeNull();
  });

  it("falls back to soccer when fixture has no sport", () => {
    const fixture = mockFixture({ sport: undefined });
    const pool = scannerOutcomeToPoolFixture(fixture, mockFlagged(), mockOutcome());
    expect(pool!.sport).toBe("soccer");
  });
});
