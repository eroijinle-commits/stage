/**
 * Unit tests for MarketBrowser component.
 * Tests compute button presence, disabled state, modal open/close,
 * and regressions on existing Expand/Collapse functionality.
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

// Mock ComputePanel to track open/close props
const mockComputePanelProps: {
    open: boolean;
    onClose: () => void;
    fixture: DiscoveryFixture | null;
} = { open: false, onClose: vi.fn(), fixture: null };
vi.mock("@/components/compute/ComputePanel", () => ({
    default: (props: { open: boolean; onClose: () => void; fixture: DiscoveryFixture | null }) => {
        mockComputePanelProps.open = props.open;
        mockComputePanelProps.onClose = props.onClose;
        mockComputePanelProps.fixture = props.fixture;
        return props.open ? <div data-testid="compute-panel-mock">ComputePanel</div> : null;
    },
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

/** Helper: get the compute button's native <button> element inside the wrapper span */
function getComputeButton() {
    const wrapper = screen.getByTestId("compute-button-wrapper");
    return within(wrapper).getByRole("button", { name: /Compute/ });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MarketBrowser — Compute button", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockComputePanelProps.open = false;
        mockComputePanelProps.fixture = null;
    });

    it("renders Compute button when fixture is present", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        const wrapper = screen.getByTestId("compute-button-wrapper");
        expect(wrapper).toBeInTheDocument();
        const btn = within(wrapper).getByRole("button", { name: /Compute/ });
        expect(btn).toBeEnabled();
    });

    it("disables Compute button when no fixture is provided", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={null} />,
        );

        const wrapper = screen.getByTestId("compute-button-wrapper");
        expect(wrapper).toBeInTheDocument();
        const btn = within(wrapper).getByRole("button", { name: /Compute/ });
        expect(btn).toBeDisabled();
    });

    it("sets correct title tooltip when no fixture", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={null} />,
        );

        const wrapper = screen.getByTestId("compute-button-wrapper");
        expect(wrapper).toHaveAttribute("title", "Load a fixture to use Compute");
    });

    it("sets correct title tooltip when fixture is present", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        const wrapper = screen.getByTestId("compute-button-wrapper");
        expect(wrapper).toHaveAttribute("title", "Open Compute panel");
    });

    it("opens ComputePanel when Compute button is clicked", async () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        const btn = getComputeButton();
        fireEvent.click(btn);

        await waitFor(() => {
            expect(screen.getByTestId("compute-panel-mock")).toBeInTheDocument();
        });
        expect(mockComputePanelProps.open).toBe(true);
    });

    it("passes current fixture to ComputePanel", async () => {
        const fixture = makeFixture({ id: "f2", name: "Liverpool vs Man United" });
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={fixture} />,
        );

        fireEvent.click(getComputeButton());

        await waitFor(() => {
            expect(mockComputePanelProps.fixture).toEqual(fixture);
        });
    });

    it("ComputePanel closes when onClose is called", async () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        // Open
        fireEvent.click(getComputeButton());
        await waitFor(() => {
            expect(screen.getByTestId("compute-panel-mock")).toBeInTheDocument();
        });

        // Close via the mocked panel's onClose
        mockComputePanelProps.onClose();

        await waitFor(() => {
            expect(screen.queryByTestId("compute-panel-mock")).not.toBeInTheDocument();
        });
    });
});

describe("MarketBrowser — Expand/Collapse regressions", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders Expand All and Collapse All buttons", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        expect(screen.getByText("Expand All")).toBeInTheDocument();
        expect(screen.getByText("Collapse All")).toBeInTheDocument();
    });

    it("renders market groups after details load", async () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        await waitFor(() => {
            expect(screen.getByText("Main Markets")).toBeInTheDocument();
        });
    });

    it("renders the Close button in footer", async () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        await waitFor(() => {
            expect(screen.getByText("Close")).toBeInTheDocument();
        });
    });

    it("shows fixture name in the header", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        expect(screen.getByText(/Arsenal/)).toBeInTheDocument();
        expect(screen.getByText(/Chelsea/)).toBeInTheDocument();
    });

    it("renders all three header buttons together", () => {
        render(
            <MarketBrowser open={true} onClose={vi.fn()} fixture={makeFixture()} />,
        );

        expect(screen.getByText("Expand All")).toBeInTheDocument();
        expect(screen.getByText("Collapse All")).toBeInTheDocument();
        expect(screen.getByTestId("compute-button-wrapper")).toBeInTheDocument();
    });
});
