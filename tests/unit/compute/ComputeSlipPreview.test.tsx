/**
 * Unit tests for ComputeSlipPreview component.
 * Tests rendering, odds display, selection toggle, combined odds, and add action.
 * @module tests/unit/compute/ComputeSlipPreview
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComputeSlipPreview from "@/components/compute/ComputeSlipPreview";
import type { ComputeSlip, ComputeSelection } from "@/lib/compute/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeSlip(id: string, selections: ComputeSelection[], combinedOdds?: number): ComputeSlip {
    const odds = combinedOdds ?? selections.reduce((acc, s) => acc * s.odds, 1);
    return { id, selections, totalCombinedOdds: odds };
}

function renderSlip(
    overrides: Partial<React.ComponentProps<typeof ComputeSlipPreview>> = {},
) {
    const slip = overrides.slip ?? makeSlip("slip-1", [
        makeSelection({ marketName: "Match Winner", outcomeName: "Home", odds: 2.0 }),
        makeSelection({
            marketId: "m2",
            marketName: "Both Teams Score",
            outcomeId: "m2-o1",
            outcomeName: "Yes",
            odds: 1.8,
        }),
    ]);
    const defaultProps = {
        slip,
        index: overrides.index ?? 0,
        checked: overrides.checked ?? false,
        onToggle: overrides.onToggle ?? vi.fn(),
        onAdd: overrides.onAdd ?? vi.fn(),
    };
    return { ...render(<ComputeSlipPreview {...defaultProps} />), props: defaultProps };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComputeSlipPreview", () => {
    describe("renders correctly", () => {
        it("shows slip number starting from 1", () => {
            renderSlip({ index: 0 });
            expect(screen.getByText("#1")).toBeTruthy();
        });

        it("shows correct slip number for non-zero index", () => {
            renderSlip({ index: 4 });
            expect(screen.getByText("#5")).toBeTruthy();
        });

        it("renders all selections", () => {
            renderSlip();
            expect(screen.getByText(/Match Winner/)).toBeTruthy();
            expect(screen.getByText(/Both Teams Score/)).toBeTruthy();
        });

        it("shows outcome names", () => {
            renderSlip();
            expect(screen.getByText(/Home/)).toBeTruthy();
            expect(screen.getByText(/Yes/)).toBeTruthy();
        });

        it("shows individual odds", () => {
            renderSlip();
            const oddsElements = screen.getAllByText("2.00");
            expect(oddsElements.length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText("1.80")).toBeTruthy();
        });

        it("shows combined odds", () => {
            renderSlip();
            // 2.0 * 1.8 = 3.6
            expect(screen.getByTestId("combined-odds-0")).toHaveTextContent("3.60");
        });
    });

    describe("single selection slip", () => {
        it("shows combined odds equal to the single outcome odds", () => {
            const slip = makeSlip("solo", [makeSelection({ odds: 3.5 })]);
            renderSlip({ slip });
            expect(screen.getByTestId("combined-odds-0")).toHaveTextContent("3.50");
        });
    });

    describe("checkbox", () => {
        it("renders unchecked by default", () => {
            renderSlip({ checked: false });
            const checkbox = screen.getByTestId("slip-checkbox-0") as HTMLInputElement;
            expect(checkbox.checked).toBe(false);
        });

        it("renders checked when checked prop is true", () => {
            renderSlip({ checked: true });
            const checkbox = screen.getByTestId("slip-checkbox-0") as HTMLInputElement;
            expect(checkbox.checked).toBe(true);
        });

        it("calls onToggle with slip id when clicked", () => {
            const onToggle = vi.fn();
            const slip = makeSlip("slip-abc", [makeSelection()]);
            renderSlip({ slip, onToggle });
            fireEvent.click(screen.getByTestId("slip-checkbox-0"));
            expect(onToggle).toHaveBeenCalledWith("slip-abc");
        });
    });

    describe("Add button", () => {
        it("calls onAdd with slip when clicked", () => {
            const onAdd = vi.fn();
            const slip = makeSlip("slip-xyz", [makeSelection()]);
            renderSlip({ slip, onAdd });
            fireEvent.click(screen.getByTestId("slip-add-0"));
            expect(onAdd).toHaveBeenCalledWith(slip);
        });

        it("renders Add button text", () => {
            renderSlip();
            expect(screen.getByTestId("slip-add-0")).toHaveTextContent("Add");
        });
    });

    describe("styling", () => {
        it("applies primary border when checked", () => {
            renderSlip({ checked: true });
            const container = screen.getByTestId("slip-preview-0");
            expect(container.className).toContain("border-primary");
        });

        it("applies default border when unchecked", () => {
            renderSlip({ checked: false });
            const container = screen.getByTestId("slip-preview-0");
            expect(container.className).toContain("border-border");
            expect(container.className).not.toContain("border-primary");
        });
    });

    describe("data-testid indexing", () => {
        it("uses correct index in test IDs", () => {
            renderSlip({ index: 3 });
            expect(screen.getByTestId("slip-preview-3")).toBeTruthy();
            expect(screen.getByTestId("slip-checkbox-3")).toBeTruthy();
            expect(screen.getByTestId("slip-add-3")).toBeTruthy();
            expect(screen.getByTestId("combined-odds-3")).toBeTruthy();
        });
    });
});
