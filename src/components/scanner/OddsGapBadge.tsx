/**
 * OddsGapBadge — color-coded badge showing the odds ratio for a flagged market.
 * @module components/scanner/OddsGapBadge
 */

import { cn } from "@/lib/utils/cn";

interface OddsGapBadgeProps {
    ratio: number;
    className?: string;
}

/**
 * Returns color classes based on the odds gap ratio.
 * - Green: ratio < 5x (moderate gap)
 * - Yellow: ratio 5–10x (notable gap)
 * - Red: ratio > 10x (extreme gap)
 */
function getGapColor(ratio: number): { bg: string; text: string; border: string } {
    if (ratio >= 10) {
        return {
            bg: "bg-red-500/15",
            text: "text-red-400",
            border: "border-red-500/30",
        };
    }
    if (ratio >= 5) {
        return {
            bg: "bg-yellow-500/15",
            text: "text-yellow-400",
            border: "border-yellow-500/30",
        };
    }
    return {
        bg: "bg-emerald-500/15",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
    };
}

export default function OddsGapBadge({ ratio, className }: OddsGapBadgeProps) {
    const colors = getGapColor(ratio);

    return (
        <span
            className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold",
                colors.bg,
                colors.text,
                colors.border,
                className,
            )}
        >
            {ratio.toFixed(1)}x
        </span>
    );
}
