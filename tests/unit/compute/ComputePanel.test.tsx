/**
 * Unit tests for ComputePanel component.
 * Tests modal rendering, config controls integration, matrix preview,
 * results list, selection toggles, add selected/all actions, and edge cases.
 * @module tests/unit/compute/ComputePanel
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComputePanel from "@/components/compute/ComputePanel";
import type { ComputeResult, ComputeSlip, ComputeSelection, RankedGroup } from "@/lib/compute/types";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";

// ─── Mock Radix Slider ────────────────────────────────────────────────────────

vi.mock("@radix-ui/react-slider", () => ({
    Root: ({ children, value, onValueChange, disabled, min, max, ...props }: any) => (
        <div data-testid={props["data-testid"]} data-value={value?.[0]} data-disabled={disabled}>
            <button
                data-testid="slider-mock-inc"
                onClick={() => {
                    if (onValueChange && value?.[0] !== undefined) {
                        onValueChange([Math.min(max, value[0] + 1)]);
                    }
                }}
            >
                +
            </button>
            {children}
        </div>
    ),
    Track: ({ children }: any) => <div>{children}</div>,
    Range: () => <div />,
    Thumb: () => <div />,
}));

// ─── Mock useCompute ──────────────────────────────────────────────────────────

const mockUseCompute = {
    config: { groups: 3, marketsPerGroup: 2 },
    setConfig: vi.fn(),
    result: null as ComputeResult | null,
    isLoading: false,
    error: null as string | null,
    permutationCount: 8,
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
        groupName: "main",
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
        config: { groups: 3, marketsPerGroup: 2 },
        selectedGroups: [
            {
                groupName: "main",
                groupTranslation: "Main Markets",
                markets: [
                    {
                        market: { id: "m1", name: "Match Winner", status: "active", extId: "e1", provider: "test", outcomes: [] },
                        groupName: "main",
                        avgOdds: 2.5,
                        outcomeCount: 3,
                    },
                ],
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
    mockUseCompute.config = { groups: 3, marketsPerGroup: 2 };
    mockUseCompute.permutationCount = 8;
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

    describe("configuration section", () => {
        it("renders Configuration heading", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Configuration")).toBeTruthy();
        });

        it("shows slider labels", () => {
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Groups")).toBeTruthy();
            expect(screen.getByText("Markets / Group")).toBeTruthy();
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
        it("shows loading skeletons when loading", () => {
            mockUseCompute.isLoading = true;
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            // Verify the generate button shows loading text
            expect(screen.getByTestId("generate-button")).toHaveTextContent("Generating…");
        });
    });

    describe("error state", () => {
        it("shows error message when error exists", () => {
            mockUseCompute.error = "API request failed";
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("API request failed")).toBeTruthy();
        });

        it("shows retry button in error state", () => {
            mockUseCompute.error = "Something went wrong";
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Retry")).toBeTruthy();
        });

        it("calls clearError and retry when retry is clicked", () => {
            mockUseCompute.error = "Error";
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            fireEvent.click(screen.getByText("Retry"));
            expect(mockUseCompute.clearError).toHaveBeenCalled();
            expect(mockUseCompute.retry).toHaveBeenCalled();
        });
    });

    describe("matrix preview", () => {
        it("shows selected markets when result has groups", () => {
            mockUseCompute.result = makeResult([]);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Selected Markets")).toBeTruthy();
            expect(screen.getByText("Main Markets")).toBeTruthy();
        });

        it("shows market names and avg odds", () => {
            mockUseCompute.result = makeResult([]);
            render(<ComputePanel open={true} onClose={vi.fn()} fixture={makeFixture()} />);
            expect(screen.getByText("Match Winner")).toBeTruthy();
            expect(screen.getByText("2.50 avg")).toBeTruthy();
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
                config: { groups: 3, marketsPerGroup: 2 },
                selectedGroups: [],
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
            // Select first slip
            fireEvent.click(screen.getByTestId("slip-checkbox-0"));
            // Click Add Selected
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
