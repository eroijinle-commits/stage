/**
 * Configuration sliders for the compute panel.
 * Groups slider (1–5) and Markets per group slider (1–3) with dynamic
 * constraints that enforce the 15-permutation cap via `getSliderMax()`.
 * Shows a real-time permutation count with color coding.
 * @module components/compute/ComputeControls
 */

import * as Slider from "@radix-ui/react-slider";
import { cn } from "@/lib/utils/cn";
import { getSliderMax, MAX_PERMUTATIONS } from "@/lib/compute/types";
import type { ComputeConfig } from "@/lib/compute/types";

interface ComputeControlsProps {
    config: ComputeConfig;
    onConfigChange: (config: ComputeConfig) => void;
    permutationCount: number;
    canGenerate: boolean;
    onGenerate: () => void;
    isLoading: boolean;
    disabled?: boolean;
}

export default function ComputeControls({
    config,
    onConfigChange,
    permutationCount,
    canGenerate,
    onGenerate,
    isLoading,
    disabled = false,
}: ComputeControlsProps) {
    const groupsMax = getSliderMax(config.groups, config.marketsPerGroup, "groups");
    const marketsMax = getSliderMax(config.groups, config.marketsPerGroup, "marketsPerGroup");

    // Clamp current values when max decreases
    const effectiveGroups = Math.min(config.groups, groupsMax);
    const effectiveMarkets = Math.min(config.marketsPerGroup, marketsMax);

    const isAtCap = permutationCount === MAX_PERMUTATIONS;
    const isOverCap = permutationCount > MAX_PERMUTATIONS;
    const isZero = permutationCount === 0;

    return (
        <div className="space-y-4">
            {/* Groups slider */}
            <SliderField
                label="Groups"
                value={effectiveGroups}
                min={1}
                max={groupsMax}
                onChange={(v) =>
                    onConfigChange({ ...config, groups: v })
                }
                disabled={disabled}
            />

            {/* Markets per group slider */}
            <SliderField
                label="Markets / Group"
                value={effectiveMarkets}
                min={1}
                max={marketsMax}
                onChange={(v) =>
                    onConfigChange({ ...config, marketsPerGroup: v })
                }
                disabled={disabled}
            />

            {/* Live permutation count */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                    Permutations
                </span>
                <span
                    data-testid="permutation-count"
                    className={cn(
                        "text-sm font-mono font-bold tabular-nums",
                        isZero && "text-muted-foreground",
                        !isZero && !isOverCap && !isAtCap && "text-bet-won",
                        isAtCap && "text-bet-pending",
                        isOverCap && "text-bet-lost",
                    )}
                >
                    {permutationCount}
                </span>
            </div>

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

// ─── Internal slider row ──────────────────────────────────────────────────────

function SliderField({
    label,
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
    disabled?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">
                    {label}
                </span>
                <span
                    data-testid={`slider-value-${label}`}
                    className="text-xs font-mono font-bold text-foreground tabular-nums"
                >
                    {value}
                </span>
            </div>
            <Slider.Root
                value={[value]}
                onValueChange={([v]) => onChange(v)}
                min={min}
                max={max}
                step={1}
                disabled={disabled}
                className="relative flex items-center select-none touch-none w-full h-5"
                data-testid={`slider-${label}`}
            >
                <Slider.Track className="bg-muted relative grow rounded-full h-[4px]">
                    <Slider.Range className="absolute bg-primary rounded-full h-full" />
                </Slider.Track>
                <Slider.Thumb
                    className={cn(
                        "block w-3.5 h-3.5 bg-foreground rounded-full",
                        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card",
                        "hover:bg-brand-400 transition-colors",
                        disabled && "opacity-40",
                    )}
                />
            </Slider.Root>
            {max < (label === "Groups" ? 5 : 3) && (
                <p className="text-[10px] font-mono text-muted-foreground">
                    Max {max} to stay within {MAX_PERMUTATIONS} cap
                </p>
            )}
        </div>
    );
}
