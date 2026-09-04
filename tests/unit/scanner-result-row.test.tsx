import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ScannerResultRow from "@/components/scanner/ScannerResultRow";
import type { FlaggedMarket } from "@/lib/scanner/types";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import type { StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";

const outcomeLow: StakeMarketOutcome = {
  __typename: "SportMarketOutcome",
  id: "outcome-low",
  name: "Under 2.5",
  odds: 1.2,
  active: true,
};

const outcomeHigh: StakeMarketOutcome = {
  __typename: "SportMarketOutcome",
  id: "outcome-high",
  name: "Over 2.5",
  odds: 6.0,
  active: true,
};

const market = {
  __typename: "SportMarket",
  id: "market-1",
  name: "Over/Under 2.5 Goals",
  outcomes: [outcomeLow, outcomeHigh],
} as unknown as StakeMarket;

const flagged: FlaggedMarket = {
  market,
  gapRatio: 5,
  minOdds: 1.2,
  maxOdds: 6.0,
  minOutcome: outcomeLow,
  maxOutcome: outcomeHigh,
};

const fixture = {
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
} as unknown as DiscoveryFixture;

function renderRow(overrides: Partial<Parameters<typeof ScannerResultRow>[0]> = {}) {
  const onAddSelection = vi.fn();
  const onAddToPool = vi.fn();
  render(
    <ScannerResultRow
      fixture={fixture}
      flaggedMarkets={[flagged]}
      onAddSelection={onAddSelection}
      onAddToPool={onAddToPool}
      {...overrides}
    />,
  );
  // Expand to reveal outcome chips
  fireEvent.click(screen.getAllByRole("button")[0]);
  return { onAddSelection, onAddToPool };
}

describe("ScannerResultRow dual action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("outcome chip click adds to slip (existing behavior)", () => {
    const { onAddSelection, onAddToPool } = renderRow();

    fireEvent.click(screen.getByText("Over 2.5"));

    expect(onAddSelection).toHaveBeenCalledTimes(1);
    expect(onAddSelection.mock.calls[0][0]).toMatchObject({
      outcomeId: "outcome-high",
      odds: 6.0,
      betType: "value-scanner",
    });
    expect(onAddToPool).not.toHaveBeenCalled();
  });

  it("pool icon click adds to BetArchitect pool", () => {
    const { onAddSelection, onAddToPool } = renderRow();

    fireEvent.click(screen.getAllByTitle("Add to BetArchitect pool")[0]);

    expect(onAddToPool).toHaveBeenCalledTimes(1);
    expect(onAddToPool.mock.calls[0][0]).toBe(flagged);
    expect(onAddToPool.mock.calls[0][1]).toMatchObject({ id: "outcome-low" });
    expect(onAddSelection).not.toHaveBeenCalled();
  });

  it("each outcome gets its own pool button", () => {
    const { onAddToPool } = renderRow();

    const poolButtons = screen.getAllByTitle("Add to BetArchitect pool");
    expect(poolButtons).toHaveLength(2);

    fireEvent.click(poolButtons[1]);
    expect(onAddToPool.mock.calls[0][1]).toMatchObject({ id: "outcome-high" });
  });
});
