/**
 * FilterChips — horizontal scrollable row of active filter chips with remove buttons.
 * @module components/discovery/FilterChips
 */

import { DiscoveryFilters, BetTypeConfig } from "@/lib/contracts/ui.contract";
import { X } from "lucide-react";

interface FilterChipsProps {
    filters: DiscoveryFilters;
    activeBetType: BetTypeConfig | null;
    onRemove: (key: keyof DiscoveryFilters) => void;
    onClearAll: () => void;
}

export default function FilterChips({ filters, activeBetType, onRemove, onClearAll }: FilterChipsProps) {
    const chips: Array<{ key: keyof DiscoveryFilters; label: string }> = [];

    if (activeBetType) {
        chips.push({ key: "betType", label: `Bet: ${activeBetType.name}` });
    }
    if (filters.betTypeLine && activeBetType?.hasLines) {
        chips.push({ key: "betTypeLine", label: `Line: ${filters.betTypeLine}` });
    }
    if (filters.searchQuery) {
        chips.push({ key: "searchQuery", label: `"${filters.searchQuery}"` });
    }
    if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        chips.push({ key: "dateFrom", label: `From: ${from}` });
    }
    if (filters.dateTo) {
        const to = new Date(filters.dateTo).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        chips.push({ key: "dateTo", label: `To: ${to}` });
    }
    if (filters.tournamentSlugs.length > 0) {
        chips.push({ key: "tournamentSlugs", label: `${filters.tournamentSlugs.length} league${filters.tournamentSlugs.length > 1 ? "s" : ""}` });
    }

    if (chips.length === 0) return null;

    return (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b border-border/50 overflow-x-auto shrink-0">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">Active:</span>
            {chips.map((chip) => (
                <span
                    key={chip.key}
                    className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 text-[10px] font-mono shrink-0"
                >
                    {chip.label}
                    <button
                        onClick={() => onRemove(chip.key)}
                        className="hover:text-foreground ml-0.5"
                        aria-label={`Remove filter: ${chip.label}`}
                    >
                        <X size={9} />
                    </button>
                </span>
            ))}
            {chips.length > 1 && (
                <button
                    onClick={onClearAll}
                    className="text-[10px] font-mono text-muted-foreground hover:text-foreground shrink-0 ml-1 transition-colors"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}
