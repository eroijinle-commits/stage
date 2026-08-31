/**
 * Unit tests for ComputeControls component.
 * Tests slider constraints, live counter color, disabled Generate state,
 * and dynamic max constraints.
 * @module tests/unit/compute/ComputeControls
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComputeControls from "@/components/compute/ComputeControls";
import type { ComputeConfig } from "@/lib/compute/types";
import { MAX_PERMUTATIONS } from "@/lib/compute/types";

// ─── Mock Radix Slider ────────────────────────────────────────────────────────

vi.mock("@radix-ui/react-slider", () => ({
    Root: ({ children, value, onValueChange, disabled, min, max, ...props }: any) => (
        <div
            data-testid={props["data-testid"]}
            data-min={min}
            data-max={max}
            data-value={value?.[0]}
            data-disabled={disabled}
        >
            {/* Simple mock: clicking increments value */}
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
            <button
                data-testid="slider-mock-dec"
                onClick={() => {
                    if (onValueChange && value?.[0] !== undefined) {
                        onValueChange([Math.max(min, value[0] - 1)]);
                    }
                }}
            >
                −
            </button>
            {children}
        </div>
    ),
    Track: ({ children }: any) => <div>{children}</div>,
    Range: () => <div />,
    Thumb: () => <div />,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderControls(overrides: Partial<React.ComponentProps<typeof ComputeControls>> = {}) {
    const defaultProps = {
        config: { groups: 3, marketsPerGroup: 2 } as ComputeConfig,
        onConfigChange: vi.fn(),
        permutationCount: 8,
        dataLoaded: true,
        canGenerate: true,
        onGenerate: vi.fn(),
        isLoading: false,
        disabled: false,
        ...overrides,
    };
    return { ...render(<ComputeControls {...defaultProps} />), props: defaultProps };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComputeControls", () => {
    describe("renders correctly", () => {
        it("shows both slider labels", () => {
            renderControls();
            expect(screen.getByText("Groups")).toBeTruthy();
            expect(screen.getByText("Markets / Group")).toBeTruthy();
        });

        it("displays clamped config values when max constrains them", () => {
            // With dataLoaded=true: getSliderMax(3, 2, "groups") = floor(15/(2*3)) = 2
            // effectiveGroups = min(3, 2) = 2
            // getSliderMax(3, 2, "marketsPerGroup") = floor(15/(3*3)) = 1
            // effectiveMarkets = min(2, 1) = 1
            renderControls({ config: { groups: 3, marketsPerGroup: 2 }, dataLoaded: true });
            expect(screen.getByTestId("slider-value-Groups")).toHaveTextContent("2");
            expect(screen.getByTestId("slider-value-Markets / Group")).toHaveTextContent("1");
        });

        it("shows permutation count", () => {
            renderControls({ permutationCount: 12 });
            expect(screen.getByTestId("permutation-count")).toHaveTextContent("12");
        });

        it("shows Generate button", () => {
            renderControls();
            expect(screen.getByTestId("generate-button")).toBeTruthy();
        });
    });

    describe("permutation count color coding", () => {
        it("uses green (bet-won) class when count is under cap", () => {
            renderControls({ permutationCount: 8 });
            const el = screen.getByTestId("permutation-count");
            expect(el.className).toContain("text-bet-won");
        });

        it("uses pending class when at cap", () => {
            renderControls({ permutationCount: MAX_PERMUTATIONS });
            const el = screen.getByTestId("permutation-count");
            expect(el.className).toContain("text-bet-pending");
        });

        it("uses danger (bet-lost) class when over cap", () => {
            renderControls({ permutationCount: 20 });
            const el = screen.getByTestId("permutation-count");
            expect(el.className).toContain("text-bet-lost");
        });

        it("uses muted class when count is 0", () => {
            renderControls({ permutationCount: 0 });
            const el = screen.getByTestId("permutation-count");
            expect(el.className).toContain("text-muted-foreground");
        });
    });

    describe("Generate button state", () => {
        it("is enabled when canGenerate is true and not loading", () => {
            renderControls({ canGenerate: true, isLoading: false });
            const btn = screen.getByTestId("generate-button");
            expect(btn).not.toBeDisabled();
        });

        it("is disabled when canGenerate is false", () => {
            renderControls({ canGenerate: false });
            const btn = screen.getByTestId("generate-button");
            expect(btn).toBeDisabled();
        });

        it("is disabled when loading", () => {
            renderControls({ isLoading: true, canGenerate: true });
            const btn = screen.getByTestId("generate-button");
            expect(btn).toBeDisabled();
        });

        it("is disabled when controls are disabled", () => {
            renderControls({ disabled: true, canGenerate: true });
            const btn = screen.getByTestId("generate-button");
            expect(btn).toBeDisabled();
        });

        it("shows 'Generating…' text when loading", () => {
            renderControls({ isLoading: true });
            expect(screen.getByTestId("generate-button")).toHaveTextContent("Generating…");
        });

        it("shows 'Generate' text when not loading", () => {
            renderControls({ isLoading: false });
            expect(screen.getByTestId("generate-button")).toHaveTextContent("Generate");
        });
    });

    describe("calls onGenerate when clicked", () => {
        it("calls onGenerate on button click", () => {
            const onGenerate = vi.fn();
            renderControls({ onGenerate, canGenerate: true });
            fireEvent.click(screen.getByTestId("generate-button"));
            expect(onGenerate).toHaveBeenCalledTimes(1);
        });
    });

    describe("slider value changes", () => {
        it("calls onConfigChange when groups slider changes", () => {
            const onConfigChange = vi.fn();
            // With marketsPerGroup=1, groupsMax = floor(15/3) = 5, effectiveGroups = min(1,5) = 1
            renderControls({
                config: { groups: 1, marketsPerGroup: 1 },
                onConfigChange,
            });
            const groupsSlider = screen.getByTestId("slider-Groups");
            const incBtn = groupsSlider.querySelector("[data-testid='slider-mock-inc']");
            fireEvent.click(incBtn!);
            expect(onConfigChange).toHaveBeenCalledWith({ groups: 2, marketsPerGroup: 1 });
        });

        it("calls onConfigChange when markets slider changes", () => {
            const onConfigChange = vi.fn();
            // With groups=1, marketsMax = min(3, floor(15/3)) = 3, effectiveMarkets = min(1,3) = 1
            renderControls({
                config: { groups: 1, marketsPerGroup: 1 },
                onConfigChange,
            });
            const marketsSlider = screen.getByTestId("slider-Markets / Group");
            const incBtn = marketsSlider.querySelector("[data-testid='slider-mock-inc']");
            fireEvent.click(incBtn!);
            expect(onConfigChange).toHaveBeenCalledWith({ groups: 1, marketsPerGroup: 2 });
        });
    });

    describe("dynamic max constraints", () => {
        it("shows max constraint hint when max is reduced", () => {
            renderControls({
                config: { groups: 2, marketsPerGroup: 3 },
                dataLoaded: true,
            });
            // With marketsPerGroup=3, groupsMax = floor(15/(3*3)) = 1
            expect(screen.getByText(/Max 1 to stay within/)).toBeTruthy();
        });

        it("does not show max hint when max is at default", () => {
            renderControls({
                config: { groups: 1, marketsPerGroup: 1 },
            });
            // With marketsPerGroup=1, groupsMax = min(5, floor(15/3)) = 5
            // With groups=1, marketsMax = min(3, floor(15/3)) = 3
            // Neither shows hint
            expect(screen.queryByText(/Max .* to stay within/)).toBeNull();
        });
    });

    describe("disabled state", () => {
        it("passes disabled to sliders", () => {
            renderControls({ disabled: true });
            const groupsSlider = screen.getByTestId("slider-Groups");
            expect(groupsSlider.getAttribute("data-disabled")).toBe("true");
        });
    });
});
