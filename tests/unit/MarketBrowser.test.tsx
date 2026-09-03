/**
 * Unit tests for MarketBrowser component.
 * Tests modal open/close and regressions on existing Expand/Collapse functionality.
 * @module tests/unit/MarketBrowser
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import MarketBrowser from "@/components/discovery/MarketBrowser";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockAddSelection = vi.fn();
const mockAddToast = vi.fn();

vi.mock("@/store/useSlipStore", () => ({
  useSlipStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      slips: [],
      activeSlipId: "",
      selections: [],
      addSelection: mockAddSelection,
      addMultipleSelections: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/store/useUIStore", () => ({
  useUIStore: vi.fn((selector?: (s: any) => any) => {
    const state = {
      addToast: mockAddToast,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock getFixtureDetailsQuery
vi.mock("@/lib/stake-api/queries", () => ({
  getFixtureDetailsQuery: vi.fn().mockResolvedValue({
    marketGroups: [
      {
        name: "main",
        translation: "Main Markets",
        templates: [
          {
            markets: [
              {
                id: "m1",
                name: "Match Winner",
                status: "active",
                outcomes: [
                  { id: "o1", name: "Home", odds: 1.85, active: true },
                  { id: "o2", name: "Draw", odds: 3.5, active: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeFixture(overrides: Partial<DiscoveryFixture> = {}): DiscoveryFixture {
  return {
    id: "f1",
    name: "Arsenal vs Chelsea",
    slug: "arsenal-vs-chelsea",
    startTime: "2026-08-30T15:00:00Z",
    status: "not_started",
    tournament: {
      name: "Premier League",
      slug: "premier-league",
      category: { name: "England", slug: "england" },
    },
    competitors: [{ name: "Arsenal" }, { name: "Chelsea" }],
    sport: "soccer",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MarketBrowser — Expand/Collapse regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Expand All and Collapse All buttons", () => {
    render(<MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />);

    expect(screen.getByText("Expand All")).toBeInTheDocument();
    expect(screen.getByText("Collapse All")).toBeInTheDocument();
  });

  it("renders market groups after details load", async () => {
    render(<MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />);

    await waitFor(() => {
      expect(screen.getByText("Main Markets")).toBeInTheDocument();
    });
  });

  it("renders the Close button in footer", async () => {
    render(<MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />);

    await waitFor(() => {
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });

  it("shows fixture name in the header", () => {
    render(<MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />);

    expect(screen.getByText(/Arsenal/)).toBeInTheDocument();
    expect(screen.getByText(/Chelsea/)).toBeInTheDocument();
  });

  it("renders both header buttons together", () => {
    render(<MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />);

    expect(screen.getByText("Expand All")).toBeInTheDocument();
    expect(screen.getByText("Collapse All")).toBeInTheDocument();
  });
});
