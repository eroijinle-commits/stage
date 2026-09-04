/**
 * ScannerFilterBar — filter bar for the Value Scanner page.
 * Sport, odds gap threshold, date range, and outcome count filters.
 * @module components/scanner/ScannerFilterBar
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Modal, Button } from "@/components/ui";
import { Search, X, Calendar } from "lucide-react";
import { DATE_PRESETS, type DatePreset } from "@/components/discovery/types";
import { getDateRangeForPreset } from "@/hooks/useDiscovery";

const SPORT_OPTIONS = [
    { slug: "soccer", label: "Soccer" },
    { slug: "tennis", label: "Tennis" },
    { slug: "cricket", label: "Cricket" },
    { slug: "american-football", label: "American Football" },
    { slug: "baseball", label: "Baseball" },
    { slug: "politics-entertainment", label: "Specials" },
    { slug: "formula-1", label: "Formula 1" },
    { slug: "dota-2", label: "Dota 2" },
    { slug: "counter-strike", label: "CS2" },
    { slug: "league-of-legends", label: "League of Legends" },
];

const GAP_THRESHOLDS = [
    { value: 2, label: "2x" },
    { value: 3, label: "3x" },
    { value: 5, label: "5x" },
    { value: 7, label: "7x" },
    { value: 10, label: "10x" },
    { value: 15, label: "15x" },
    { value: 20, label: "20x" },
];

const OUTCOME_COUNT_OPTIONS = [
    { value: null, label: "Any" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 5, label: "5+" },
];

export interface ScannerFilters {
    sport: string;
    minGapRatio: number;
    outcomeCount: number | null;
    dateFrom: number | null;
    dateTo: number | null;
}

interface ScannerFilterBarProps {
    filters: ScannerFilters;
    onChange: (partial: Partial<ScannerFilters>) => void;
}

export default function ScannerFilterBar({ filters, onChange }: ScannerFilterBarProps) {
    const [datePreset, setDatePreset] = useState<DatePreset | null>("today");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState("");
    const [customDateTo, setCustomDateTo] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Date preset handler
    const handleDatePreset = useCallback(
        (preset: DatePreset) => {
            if (preset === "custom") {
                setDatePreset("custom");
                setShowDatePicker(true);
                return;
            }
            setDatePreset(preset);
            const range = getDateRangeForPreset(preset);
            if (range) {
                onChange({ dateFrom: range.dateFrom, dateTo: range.dateTo });
            }
        },
        [onChange],
    );

    // Custom date apply
    const handleCustomDateApply = useCallback(() => {
        const from = customDateFrom ? new Date(customDateFrom + "T00:00:00").getTime() : null;
        const to = customDateTo ? new Date(customDateTo + "T23:59:59").getTime() : null;
        onChange({ dateFrom: from, dateTo: to });
        setShowDatePicker(false);
    }, [customDateFrom, customDateTo, onChange]);

    // Clear all
    const handleClearAll = useCallback(() => {
        setDatePreset(null);
        setSearchQuery("");
        onChange({
            minGapRatio: 5,
            outcomeCount: null,
            dateFrom: null,
            dateTo: null,
        });
    }, [onChange]);

    const hasActiveFilters =
        filters.minGapRatio !== 5 ||
        filters.outcomeCount !== null ||
        filters.dateFrom !== null ||
        filters.dateTo !== null;

    return (
        <div className="px-4 py-3 border-b border-border space-y-3 shrink-0">
            {/* Row 1: Sport, Gap Threshold */}
            <div className="flex items-end gap-3 flex-wrap">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Sport
                    </label>
                    <select
                        value={filters.sport}
                        onChange={(e) => onChange({ sport: e.target.value })}
                        className="bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                    >
                        {SPORT_OPTIONS.map((s) => (
                            <option key={s.slug} value={s.slug}>
                                {s.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                        Min Odds Gap
                    </label>
                    <div className="flex items-center gap-0.5">
                        {GAP_THRESHOLDS.map((t) => (
                            <button
                                key={t.value}
                                type="button"
                                onClick={() => onChange({ minGapRatio: t.value })}
                                className={cn(
                                    "px-2 py-1.5 rounded border text-[10px] font-mono transition-colors",
                                    filters.minGapRatio === t.value
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clear */}
                {hasActiveFilters && (
                    <button
                        onClick={handleClearAll}
                        className="flex items-center gap-1 px-2 py-1.5 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                        <X size={9} />
                        Clear
                    </button>
                )}
            </div>

            {/* Row 2: Date presets, Outcome count */}
            <div className="flex items-center gap-3 flex-wrap">
                {/* Date presets */}
                <div className="flex items-center gap-1">
                    <Calendar size={11} className="text-muted-foreground shrink-0" />
                    {DATE_PRESETS.filter((p) => p.id !== "custom").map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleDatePreset(preset.id)}
                            className={cn(
                                "px-2 py-0.5 rounded border text-[10px] font-mono transition-colors",
                                datePreset === preset.id
                                    ? "border-primary bg-primary/15 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                            )}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => handleDatePreset("custom")}
                        className={cn(
                            "px-2 py-0.5 rounded border text-[10px] font-mono transition-colors",
                            datePreset === "custom"
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                        )}
                    >
                        Custom
                    </button>
                </div>

                {/* Outcome count */}
                <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">Outcomes:</span>
                    {OUTCOME_COUNT_OPTIONS.map((opt) => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => onChange({ outcomeCount: opt.value })}
                            className={cn(
                                "px-2 py-0.5 rounded border text-[10px] font-mono transition-colors",
                                filters.outcomeCount === opt.value
                                    ? "border-primary bg-primary/15 text-primary"
                                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Date Picker Modal */}
            {showDatePicker && (
                <Modal
                    open={showDatePicker}
                    onClose={() => setShowDatePicker(false)}
                    title="Custom Date Range"
                    size="sm"
                >
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase">From</label>
                                <input
                                    type="date"
                                    value={customDateFrom}
                                    onChange={(e) => setCustomDateFrom(e.target.value)}
                                    className="bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-mono text-muted-foreground uppercase">To</label>
                                <input
                                    type="date"
                                    value={customDateTo}
                                    onChange={(e) => setCustomDateTo(e.target.value)}
                                    className="bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(false)}>
                                Cancel
                            </Button>
                            <Button size="sm" onClick={handleCustomDateApply}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
