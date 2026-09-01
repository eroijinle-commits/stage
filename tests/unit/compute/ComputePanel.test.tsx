/**
 * Unit tests for ComputePanel component.
 * Tests modal rendering, config controls integration, matrix preview,
 * results list, selection toggles, add selected/all actions, and edge cases.
 * @module tests/unit/compute/ComputePanel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComputePanel from "@/components/compute/ComputePanel";
import type { ComputeResult, ComputeSlip, ComputeSelection } from "@/lib/compute/types";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";

// ─── Mock useCompute ──────────────────────────────────────────────────────────

const mockUseCompute = {
    config: { maxOutcomes: 2, slipCount: 16 },
    setConfig: vi.fn(),
    result: null as ComputeResult | null,
    isLoading: false,
    error: null as string | null,
    permutationCount: 16,
    availableSlipCounts: [16, 32, 64],
    canGenerate: true,
    runCompute: vi.fn(),
    addSlipToBetSlip: vi.fn(),
    addSelectedSlips: vi.fn(),
    addAllSlips: vi.fn(),
    retry: vi.fn(),
    clearError: vi.fn(),
};

vi.mock("@/hooks/useCompute", () => ({
    useCompute: () => mockUseCompute,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

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

function makeSelection(overrides: Partial<ComputeSelection> = {}): ComputeSelection {
    return {
        marketId: "m1",
        marketName: "Match Winner",
        outcomeId: "m1-o0",
        outcomeName: "Home",
        odds: 2.0,
        ...overrides,
    };
}

function makeSlip(id: string, selections: ComputeSelection[], odds?: number): ComputeSlip {
    return {
        id,
        selections,
        totalCombinedOdds: odds ?? selections.reduce((a, s) => a * s.odds, 1),
    };
}

function makeResult(slips: ComputeSlip[]): ComputeResult {
    return {
        fixtureName: "Arsenal vs Chelsea",
        fixtureSlug: "arsenal-vs-chelsea",
        selectedMarkets: [
            {
                market: { id: "m1", name: "Match Winner", status: "active", extId: "e1", provider: "test", outcomes: [] },
                highestOdds: 2.5,
                outcomeCount: 3,
            },
        ],
        totalPermutations: slips.length,
        slips,
    };
}

// ─── Reset ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    Object.values(mockUseCompute).forEach((v) => {
        if (typeof v === "function") v.mockClear();
    });
    mockUseCompute.result = null;
    mockUseCompute.isLoading = false;
    mockUseCompute.error = null;
    mockUseCompute.config = { maxOutcomes: 2, slipCount: 16 };
    mockUseCompute.permutationCount = 16;
    mockUseCompute.availableSlipCounts = [16, 32, 64];
    mockUseCompute.canGenerate = true;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComputePanel", () => {
    describe("modal rendering", () => {
        it("does not render when closed", () => {
            render(<ComputePanel open={false} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.queryByText("Arsenal vs Chelsea")).toBeNull();
        });

        it("renders when open with fixture name as title", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Arsenal vs Chelsea")).toBeTruthy();
        });

        it("shows tournament as description", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Premier League")).toBeTruthy();
        });

        it("handles null fixture gracefully", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={null} />);
            expect(screen.getByText("Compute")).toBeTruthy();
        });
    });

    describe("generate action", () => {
        it("calls runCompute when generate is clicked", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByTestId("generate-button"));
            expect(mockUseCompute.runCompute).toHaveBeenCalledTimes(1);
        });
    });

    describe("loading state", () => {
        it("shows generating text when loading", () => {
            mockUseCompute.isLoading = true;
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByTestId("generate-button")).toHaveTextContent("Generating…");
        });
    });

    describe("error state", () => {
        it("shows error message when error exists", () => {
            mockUseCompute.error = "API request failed";
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("API request failed")).toBeTruthy();
        });
    });

    describe("matrix preview", () => {
        it("shows selected markets when result has markets", () => {
            mockUseCompute.result = makeResult([]);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Selected Markets")).toBeTruthy();
            expect(screen.getByText("Match Winner")).toBeTruthy();
        });

        it("shows market names and best odds", () => {
            mockUseCompute.result = makeResult([]);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Match Winner")).toBeTruthy();
            expect(screen.getByText("2.50 best")).toBeTruthy();
        });
    });

    describe("results list", () => {
        const slips = [
            makeSlip("s1", [makeSelection(), makeSelection({ marketId: "m2", outcomeId: "m2-o1", odds: 1.8 })]),
            makeSlip("s2", [makeSelection({ odds: 3.0 }), makeSelection({ marketId: "m2", outcomeId: "m2-o1", odds: 1.8 })]),
        ];

        it("shows Generated Slips heading", () => {
            mockUseCompute.result = makeResult(slips);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Generated Slips")).toBeTruthy();
        });

        it("shows total count", () => {
            mockUseCompute.result = makeResult(slips);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("2 total")).toBeTruthy();
        });

        it("renders slip previews", () => {
            mockUseCompute.result = makeResult(slips);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByTestId("slip-preview-0")).toBeTruthy();
            expect(screen.getByTestId("slip-preview-1")).toBeTruthy();
        });

        it("shows empty state when slips array is empty", () => {
            mockUseCompute.result = makeResult([]);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText(/No permutations could be generated/)).toBeTruthy();
        });
    });

    describe("empty state after generation", () => {
        it("shows empty state message when result has 0 slips", () => {
            mockUseCompute.result = {
                fixtureName: "Test",
                fixtureSlug: "test",
                selectedMarkets: [],
                totalPermutations: 0,
                slips: [],
            };
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText(/No permutations could be generated/)).toBeTruthy();
        });
    });

    describe("selection and add actions", () => {
        const slips = [
            makeSlip("s1", [makeSelection()]),
            makeSlip("s2", [makeSelection({ odds: 3.0 })]),
        ];

        beforeEach(() => {
            mockUseCompute.result = makeResult(slips);
        });

        it("shows Add All button with count", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByTestId("add-all-button")).toHaveTextContent("Add All (2)");
        });

        it("shows Add Selected button with 0 count initially", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByTestId("add-selected-button")).toHaveTextContent("Add Selected (0)");
        });

        it("calls addAllSlips when Add All is clicked", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByTestId("add-all-button"));
            expect(mockUseCompute.addAllSlips).toHaveBeenCalledTimes(1);
        });

        it("enables Add Selected when checkboxes are checked", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByTestId("slip-checkbox-0"));
            expect(screen.getByTestId("add-selected-button")).toHaveTextContent("Add Selected (1)");
        });

        it("calls addSelectedSlips with selected ids", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByTestId("slip-checkbox-0"));
            fireEvent.click(screen.getByTestId("add-selected-button"));
            expect(mockUseCompute.addSelectedSlips).toHaveBeenCalledWith(["s1"]);
        });

        it("calls addSlipToBetSlip when individual Add is clicked", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByTestId("slip-add-0"));
            expect(mockUseCompute.addSlipToBetSlip).toHaveBeenCalledWith(slips[0]);
        });

        it("Add Selected is disabled when no slips are selected", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            const btn = screen.getByTestId("add-selected-button");
            expect(btn).toBeDisabled();
        });
    });

    describe("no result state", () => {
        it("does not show action buttons when no result", () => {
            mockUseCompute.result = null;
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.queryByTestId("add-all-button")).toBeNull();
            expect(screen.queryByTestId("add-selected-button")).toBeNull();
        });

        it("does not show Generated Slips when no result", () => {
            mockUseCompute.result = null;
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.queryByText("Generated Slips")).toBeNull();
        });
    });
});
