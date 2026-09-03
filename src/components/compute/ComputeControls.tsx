/**
 * Configuration dropdowns for the compute panel.
 * Two Select dropdowns: "Outcomes / Market" (2 or 3) and "Number of Slips"
 * (dynamic options based on outcomes selection).
 * Shows derived info: markets needed, permutation count.
 * @module components/compute/ComputeControls
 */

import Select from "@/components/ui/Select";
import { cn } from "@/lib/utils/cn";
import { marketsNeeded, SLIP_OPTIONS } from "@/lib/compute/types";
import type { ComputeConfig } from "@/lib/compute/types";

interface ComputeControlsProps {
  config: ComputeConfig;
  onConfigChange: (config: ComputeConfig) => void;
  permutationCount: number;
  availableSlipCounts: number[];
  canGenerate: boolean;
  onGenerate: () => void;
  isLoading: boolean;
  disabled?: boolean;
  error?: string | null;
}

export default function ComputeControls({
  config,
  onConfigChange,
  permutationCount,
  availableSlipCounts,
  canGenerate,
  onGenerate,
  isLoading,
  disabled = false,
  error,
}: ComputeControlsProps) {
  const outcomesOptions = [
    { value: "2", label: "2 (binary markets)" },
    { value: "3", label: "3 (ternary markets)" },
  ];

  const slipOptions = availableSlipCounts.map((n) => ({
    value: String(n),
    label: String(n),
  }));

  const needed = marketsNeeded(config.slipCount, config.maxOutcomes);
  const isZero = permutationCount === 0;

  return (
    <div className="space-y-4">
      {/* Outcomes / Market dropdown */}
      <Select
        label="Outcomes / Market"
        value={String(config.maxOutcomes)}
        options={outcomesOptions}
        onChange={(v) => onConfigChange({ ...config, maxOutcomes: Number(v) as 2 | 3 })}
        disabled={disabled}
        data-testid="select-outcomes"
      />

      {/* Number of Slips dropdown */}
      <Select
        label="Number of Slips"
        value={String(config.slipCount)}
        options={slipOptions}
        onChange={(v) => onConfigChange({ ...config, slipCount: Number(v) })}
        disabled={disabled}
        data-testid="select-slips"
      />

      {/* Derived info */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">Markets needed</span>
        <span
          data-testid="markets-needed"
          className="text-sm font-mono font-bold text-foreground tabular-nums"
        >
          {needed}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground">Permutations</span>
        <span
          data-testid="permutation-count"
          className={cn(
            "text-sm font-mono font-bold tabular-nums",
            isZero ? "text-muted-foreground" : "text-bet-won",
          )}
        >
          {permutationCount}
        </span>
      </div>

      {/* Error when not enough markets */}
      {error && <p className="text-xs font-mono text-bet-lost">{error}</p>}

      {/* Generate button */}
      <button
        data-testid="generate-button"
        onClick={onGenerate}
        disabled={!canGenerate || isLoading || disabled}
        className={cn(
          "w-full py-2 px-4 rounded text-xs font-mono font-semibold transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          canGenerate && !isLoading
            ? "bg-primary text-primary-foreground hover:bg-brand-400 active:bg-brand-600"
            : "bg-secondary text-secondary-foreground border border-border",
        )}
      >
        {isLoading ? "Generating…" : "Generate"}
      </button>
    </div>
  );
}
