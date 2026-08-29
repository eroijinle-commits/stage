/**
 * SearchFilterBar — full search/filter bar with sport, bet type, date range,
 * league/tournament multi-select, saved filters, and search.
 * @module components/discovery/SearchFilterBar
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { DiscoveryFilters, BetTypeConfig } from "@/lib/contracts/ui.contract";
import BetTypeSelector from "./BetTypeSelector";
import BetTypeLineSelector from "./BetTypeLineSelector";
import { Input, Button, MultiSelect, Modal } from "@/components/ui";
import { Search, X, Calendar, Bookmark, BookmarkPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { getDateRangeForPreset } from "@/hooks/useDiscovery";
import { DATE_PRESETS, type DatePreset } from "./types";

interface SearchFilterBarProps {
  filters: DiscoveryFilters;
  onChange: (partial: Partial<DiscoveryFilters>) => void;
  activeBetType: BetTypeConfig | null;
  lineOddsPreview: Record<string, { over: number; under: number }>;
  tournaments: Array<{ name: string; slug: string; category: { name: string } }>;
}

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

export default function SearchFilterBar({ filters, onChange, activeBetType, lineOddsPreview, tournaments }: SearchFilterBarProps) {
  const { filters: savedFilters, createFilter, deleteFilter } = useSavedFilters();
  const [datePreset, setDatePreset] = useState<DatePreset | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [showLoadFilter, setShowLoadFilter] = useState(false);
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearch, setLocalSearch] = useState(filters.searchQuery);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      onChange({ searchQuery: value });
    }, 300);
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  // Date preset handler
  const handleDatePreset = useCallback((preset: DatePreset) => {
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
  }, [onChange]);

  // Custom date apply
  const handleCustomDateApply = useCallback(() => {
    const from = customDateFrom ? new Date(customDateFrom + "T00:00:00").getTime() : null;
    const to = customDateTo ? new Date(customDateTo + "T23:59:59").getTime() : null;
    onChange({ dateFrom: from, dateTo: to });
    setShowDatePicker(false);
  }, [customDateFrom, customDateTo, onChange]);

  // Save filter
  const handleSaveFilter = useCallback(async () => {
    if (!filterName.trim()) return;
    await createFilter({
      name: filterName.trim(),
      sport: filters.sport,
      group: filters.group,
      tournamentSlugs: filters.tournamentSlugs,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      marketTemplate: filters.betType,
    });
    setFilterName("");
    setShowSaveFilter(false);
  }, [filterName, filters, createFilter]);

  // Load saved filter
  const handleLoadFilter = useCallback((saved: typeof savedFilters[0]) => {
    onChange({
      sport: saved.sport ?? filters.sport,
      group: saved.group ?? filters.group,
      tournamentSlugs: saved.tournamentSlugs,
      dateFrom: saved.dateFrom,
      dateTo: saved.dateTo,
      betType: saved.marketTemplate ?? filters.betType,
    });
    // Update date preset indicator
    if (saved.dateFrom && saved.dateTo) {
      setDatePreset("custom");
    }
    setShowLoadFilter(false);
  }, [onChange, filters.sport, filters.group, filters.betType]);

  // Tournament multi-select options
  const tournamentOptions = tournaments.map((t) => ({
    value: t.name,
    label: `${t.category.name} · ${t.name}`,
  }));

  // Clear all filters
  const handleClearAll = useCallback(() => {
    setDatePreset(null);
    setLocalSearch("");
    onChange({
      betType: null,
      betTypeLine: null,
      dateFrom: null,
      dateTo: null,
      tournamentSlugs: [],
      searchQuery: "",
    });
  }, [onChange]);

  // Check if any filters are active (beyond sport/group)
  const hasActiveFilters = !!filters.searchQuery || filters.dateFrom !== null || filters.dateTo !== null || filters.tournamentSlugs.length > 0;

  return (
    <div className="px-4 py-3 border-b border-border space-y-3 shrink-0">
      {/* Row 1: Sport, Bet Type, Search */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Sport</label>
          <select
            value={filters.sport}
            onChange={(e) => onChange({ sport: e.target.value })}
            className="bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring"
          >
            {SPORT_OPTIONS.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
          </select>
        </div>

        <BetTypeSelector
          value={filters.betType}
          onChange={(id) => onChange({ betType: id })}
          sport={filters.sport}
        />

        <div className="flex-1 min-w-[200px]">
          <Input
            value={localSearch}
            onChange={handleSearchChange}
            placeholder="Search fixtures, leagues, teams..."
            label="Search"
            prefix={<Search size={13} />}
          />
        </div>

        {/* Saved filter actions */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" icon={<Bookmark size={12} />} onClick={() => setShowLoadFilter(true)}>
            Load
          </Button>
          <Button variant="ghost" size="sm" icon={<BookmarkPlus size={12} />} onClick={() => setShowSaveFilter(true)}>
            Save
          </Button>
        </div>
      </div>

      {/* Row 2: Date presets, Leagues */}
      <div className="flex items-center gap-2 flex-wrap">
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

        {/* Tournament picker */}
        <button
          type="button"
          onClick={() => setShowTournamentPicker(true)}
          className={cn(
            "px-2 py-0.5 rounded border text-[10px] font-mono transition-colors",
            filters.tournamentSlugs.length > 0
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
          )}
        >
          Leagues {filters.tournamentSlugs.length > 0 ? `(${filters.tournamentSlugs.length})` : ""}
        </button>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2 py-0.5 rounded border border-border text-[10px] font-mono text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
          >
            <X size={9} />
            Clear all
          </button>
        )}
      </div>

      {/* Bet Type Line Selector */}
      {activeBetType?.hasLines && (
        <BetTypeLineSelector
          betTypeId={activeBetType.id}
          value={filters.betTypeLine}
          onChange={(line) => onChange({ betTypeLine: line })}
          lineOdds={lineOddsPreview}
        />
      )}

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <Modal open={showDatePicker} onClose={() => setShowDatePicker(false)} title="Custom Date Range" size="sm">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-mono text-muted-foreground">From</label>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-mono text-muted-foreground">To</label>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-foreground focus:outline-none focus:border-ring mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDatePicker(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCustomDateApply}>Apply</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Save Filter Modal */}
      {showSaveFilter && (
        <Modal open={showSaveFilter} onClose={() => setShowSaveFilter(false)} title="Save Filter" size="sm">
          <div className="space-y-3">
            <Input
              value={filterName}
              onChange={setFilterName}
              placeholder="e.g. Weekend EPL Goals"
              label="Filter Name"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSaveFilter(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSaveFilter} disabled={!filterName.trim()}>Save</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Load Filter Modal */}
      {showLoadFilter && (
        <Modal open={showLoadFilter} onClose={() => setShowLoadFilter(false)} title="Load Saved Filter" size="sm">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {savedFilters.length === 0 && (
              <p className="text-xs font-mono text-muted-foreground text-center py-4">No saved filters yet</p>
            )}
            {savedFilters.map((sf) => (
              <div key={sf.id} className="flex items-center justify-between px-3 py-2 rounded hover:bg-muted transition-colors">
                <button
                  type="button"
                  onClick={() => handleLoadFilter(sf)}
                  className="flex-1 text-left"
                >
                  <span className="text-xs font-mono text-foreground">{sf.name}</span>
                  <span className="text-[10px] font-mono text-muted-foreground block">
                    {sf.sport ?? "any"} · {sf.group ?? "all"}
                  </span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteFilter(sf.id); }}
                  className="text-muted-foreground hover:text-bet-lost transition-colors ml-2"
                  aria-label={`Delete filter: ${sf.name}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Tournament Multi-Select Modal */}
      {showTournamentPicker && (
        <Modal open={showTournamentPicker} onClose={() => setShowTournamentPicker(false)} title="Filter by League" size="md">
          <div className="space-y-3">
            <MultiSelect
              options={tournamentOptions}
              value={filters.tournamentSlugs}
              onChange={(slugs) => onChange({ tournamentSlugs: slugs })}
              placeholder="Select leagues..."
              maxSelected={10}
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setShowTournamentPicker(false)}>Done</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
