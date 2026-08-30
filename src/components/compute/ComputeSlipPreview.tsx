/**
 * Individual slip preview row for compute-generated permutations.
 * Shows slip number, outcomes (market: outcome × odds), combined odds,
 * a selection checkbox, and an "Add" button.
 * @module components/compute/ComputeSlipPreview
 */

import { cn } from "@/lib/utils/cn";
import type { ComputeSlip } from "@/lib/compute/types";

interface ComputeSlipPreviewProps {
    slip: ComputeSlip;
    index: number;
    checked: boolean;
    onToggle: (id: string) => void;
    onAdd: (slip: ComputeSlip) => void;
}

export default function ComputeSlipPreview({
    slip,
    index,
    checked,
    onToggle,
    onAdd,
}: ComputeSlipPreviewProps) {
    return (
        <div
            data-testid={`slip-preview-${index}`}
            className={cn(
                "border rounded p-2.5 text-xs font-mono space-y-1.5 transition-colors",
                checked
                    ? "border-primary bg-primary/5"
                    : "border-border",
            )}
        >
            {/* Header row: slip number + checkbox + add button */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggle(slip.id)}
                        data-testid={`slip-checkbox-${index}`}
                        className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="text-muted-foreground font-semibold">
                        #{index + 1}
                    </span>
                </div>
                <button
                    onClick={() => onAdd(slip)}
                    data-testid={`slip-add-${index}`}
                    className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-semibold transition-colors",
                        "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                >
                    Add
                </button>
            </div>

            {/* Outcomes list */}
            <div className="space-y-0.5">
                {slip.selections.map((sel) => (
                    <div
                        key={sel.outcomeId}
                        className="flex items-center justify-between text-muted-foreground"
                    >
                        <span className="truncate">
                            <span className="text-foreground">{sel.marketName}</span>
                            {": "}
                            {sel.outcomeName}
                        </span>
                        <span className="text-foreground font-semibold tabular-nums ml-2 shrink-0">
                            {sel.odds.toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>

            {/* Combined odds */}
            <div className="flex items-center justify-between pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Combined</span>
                <span
                    data-testid={`combined-odds-${index}`}
                    className="text-primary font-bold tabular-nums"
                >
                    {slip.totalCombinedOdds.toFixed(2)}
                </span>
            </div>
        </div>
    );
}
