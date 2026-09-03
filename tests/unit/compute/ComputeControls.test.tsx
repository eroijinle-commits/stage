/**
 * Unit tests for ComputeControls component.
 * Tests dropdown controls, live counter, disabled Generate state,
 * and markets needed display.
 * @module tests/unit/compute/ComputeControls
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ComputeControls from "@/components/compute/ComputeControls";
import type { ComputeConfig } from "@/lib/compute/types";
import { MAX_PERMUTATIONS } from "@/lib/compute/types";

// ─── Mock Select ─────────────────────────────────────────────────────────────

vi.mock("@/components/ui/Select", () => ({
  default: ({ label, value, options, onChange, disabled, "data-testid": testId }: any) => (
    <div data-testid={testId} data-disabled={disabled}>
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        data-testid={`${testId}-select`}
      >
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderControls(overrides: Partial<React.ComponentProps<typeof ComputeControls>> = {}) {
  const defaultProps = {
    config: { maxOutcomes: 2, slipCount: 16 } as ComputeConfig,
    onConfigChange: vi.fn(),
    permutationCount: 8,
    availableSlipCounts: [16, 32, 64],
    canGenerate: true,
    onGenerate: vi.fn(),
    isLoading: false,
    disabled: false,
    error: null as string | null,
    ...overrides,
  };
  return { ...render(<ComputeControls {...defaultProps} />), props: defaultProps };
}

afterEach(() => {
  cleanup();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ComputeControls", () => {
  describe("renders correctly", () => {
    it("shows both dropdown labels", () => {
      renderControls();
      expect(screen.getByText("Outcomes / Market")).toBeTruthy();
      expect(screen.getByText("Number of Slips")).toBeTruthy();
    });

    it("shows markets needed value", () => {
      // slipCount=16, maxOutcomes=2 → needed = 4
      renderControls({
        config: { maxOutcomes: 2, slipCount: 16 },
      });
      expect(screen.getByTestId("markets-needed")).toHaveTextContent("4");
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
    it("uses green (bet-won) class when count is non-zero", () => {
      renderControls({ permutationCount: 8 });
      const el = screen.getByTestId("permutation-count");
      expect(el.className).toContain("text-bet-won");
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

  describe("dropdown value changes", () => {
    it("calls onConfigChange when outcomes dropdown changes", () => {
      const onConfigChange = vi.fn();
      renderControls({
        config: { maxOutcomes: 2, slipCount: 16 },
        onConfigChange,
      });
      fireEvent.change(screen.getByTestId("select-outcomes-select"), {
        target: { value: "3" },
      });
      expect(onConfigChange).toHaveBeenCalledWith({ maxOutcomes: 3, slipCount: 16 });
    });

    it("calls onConfigChange when slips dropdown changes", () => {
      const onConfigChange = vi.fn();
      renderControls({
        config: { maxOutcomes: 2, slipCount: 16 },
        onConfigChange,
      });
      fireEvent.change(screen.getByTestId("select-slips-select"), {
        target: { value: "32" },
      });
      expect(onConfigChange).toHaveBeenCalledWith({ maxOutcomes: 2, slipCount: 32 });
    });
  });

  describe("markets needed calculation", () => {
    it("shows 4 for slipCount=16, maxOutcomes=2", () => {
      renderControls({ config: { maxOutcomes: 2, slipCount: 16 } });
      expect(screen.getByTestId("markets-needed")).toHaveTextContent("4");
    });

    it("shows 3 for slipCount=27, maxOutcomes=3", () => {
      renderControls({ config: { maxOutcomes: 3, slipCount: 27 } });
      expect(screen.getByTestId("markets-needed")).toHaveTextContent("3");
    });

    it("shows 6 for slipCount=64, maxOutcomes=2", () => {
      renderControls({ config: { maxOutcomes: 2, slipCount: 64 } });
      expect(screen.getByTestId("markets-needed")).toHaveTextContent("6");
    });
  });

  describe("error display", () => {
    it("shows error message when error is provided", () => {
      renderControls({ error: "Not enough qualifying markets" });
      expect(screen.getByText("Not enough qualifying markets")).toBeTruthy();
    });

    it("does not show error when error is null", () => {
      renderControls({ error: null });
      expect(screen.queryByText("Not enough qualifying markets")).toBeNull();
    });
  });

  describe("disabled state", () => {
    it("passes disabled to selects", () => {
      renderControls({ disabled: true });
      const outcomesSelect = screen.getByTestId("select-outcomes");
      expect(outcomesSelect.getAttribute("data-disabled")).toBe("true");
    });
  });
});
