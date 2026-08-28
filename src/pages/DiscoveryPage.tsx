/**
 * DiscoveryPage — main discovery view. Orchestrates search/filter bar,
 * fixture table with selection, bulk market applier, market browser modal,
 * filter chips, and pagination.
 * @module pages/DiscoveryPage
 */

import { useState, useCallback } from "react";
import { useDiscovery } from "@/hooks/useDiscovery";
import FixtureRow from "@/components/discovery/FixtureRow";
import SearchFilterBar from "@/components/discovery/SearchFilterBar";
import BulkMarketApplier from "@/components/discovery/BulkMarketApplier";
import MarketBrowser from "@/components/discovery/MarketBrowser";
import FilterChips from "@/components/discovery/FilterChips";
import { Badge, Button, Skeleton } from "@/components/ui";
import { BetSelection, DiscoveryFixture } from "@/lib/contracts/ui.contract";
import { useSlipStore } from "@/store/useSlipStore";
import { useUIStore } from "@/store/useUIStore";
import { Radio, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export default function DiscoveryPage({
  activeSport,
  selectedTournamentSlugs = [],
}: {
  activeSport?: string;
  selectedTournamentSlugs?: string[];
}) {
  const {
    filters,
    setFilters,
    fixtures,
    filteredCount,
    isLoading,
    error,
    activeBetType,
    lineOddsPreview,
    tournaments,
    page,
    totalPages,
    setPage,
    refetch,
  } = useDiscovery(activeSport, selectedTournamentSlugs);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marketBrowserOpen, setMarketBrowserOpen] = useState(false);
  const [selectedFixtureSlug, setSelectedFixtureSlug] = useState<DiscoveryFixture | null>(null);
  const addSelection = useSlipStore((s) => s.addSelection);
  const toggleSlip = useUIStore((s) => s.toggleSlip);

  const liveCount = fixtures.filter((f) => f.isLive).length;
  const selectedFixtures = fixtures.filter((f) => selectedIds.includes(f.id));

  const handleAddSelection = useCallback((sel: BetSelection) => {
    addSelection(sel);
    toggleSlip(true);
  }, [addSelection, toggleSlip]);

  const handleAddSelections = useCallback((sels: BetSelection[]) => {
    sels.forEach((s) => addSelection(s));
    toggleSlip(true);
    setSelectedIds([]);
  }, [addSelection, toggleSlip]);

  const toggleSelect = useCallback((id: string, v: boolean) =>
    setSelectedIds((prev) => v ? [...prev, id] : prev.filter((x) => x !== id)), []);

  const toggleAll = useCallback((v: boolean) =>
    setSelectedIds(v ? fixtures.map((f) => f.id) : []), [fixtures]);

  const handleViewMarkets = useCallback((fixture: DiscoveryFixture) => {
    setSelectedFixtureSlug(fixture);
    setMarketBrowserOpen(true);
  }, []);

  const handleRemoveFilter = useCallback((key: keyof typeof filters) => {
    const defaults: Record<string, unknown> = {
      betType: null,
      betTypeLine: null,
      searchQuery: "",
      dateFrom: null,
      dateTo: null,
      tournamentSlugs: [],
    };
    setFilters({ [key]: defaults[key] ?? null } as Partial<typeof filters>);
  }, [setFilters]);

  const handleClearAllFilters = useCallback(() => {
    setFilters({
      betType: null,
      betTypeLine: null,
      searchQuery: "",
      dateFrom: null,
      dateTo: null,
      tournamentSlugs: [],
    });
  }, [setFilters]);

  const betTypeLabel = activeBetType
    ? activeBetType.name + (filters.betTypeLine && activeBetType.hasLines ? ` — ${filters.betTypeLine}` : "")
    : "Markets";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search & Filter Bar */}
      <SearchFilterBar
        filters={filters}
        onChange={setFilters}
        activeBetType={activeBetType}
        lineOddsPreview={lineOddsPreview}
        tournaments={tournaments}
      />

      {/* Active Filter Chips */}
      <FilterChips
        filters={filters}
        activeBetType={activeBetType}
        onRemove={handleRemoveFilter}
        onClearAll={handleClearAllFilters}
      />

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <BulkMarketApplier
          selectedFixtures={selectedFixtures}
          activeBetType={activeBetType}
          betTypeLine={filters.betTypeLine}
          onAddSelections={handleAddSelections}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {/* Status Bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50 shrink-0 text-[10px] font-mono text-muted-foreground">
        <span>{filteredCount} fixtures</span>
        {liveCount > 0 && (
          <span className="flex items-center gap-1">
            <Radio size={9} className="text-bet-lost animate-pulse" />
            <span className="text-bet-lost">{liveCount} live</span>
          </span>
        )}
        {activeBetType && (
          <Badge variant="info" size="sm">{activeBetType.name}{filters.betTypeLine ? ` ${filters.betTypeLine}` : ""}</Badge>
        )}
        <div className="ml-auto">
          <button onClick={refetch} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-center">
          <p className="text-xs font-mono text-bet-lost">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Fixture Table */}
      <div className="flex-1 overflow-auto">
        {isLoading && fixtures.length === 0 ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="w-3.5 h-3.5 rounded" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : fixtures.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-mono text-muted-foreground">No matches found</p>
            <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">Try adjusting your filters</p>
            <Button variant="outline" size="sm" onClick={handleClearAllFilters} className="mt-3">
              Clear Filters
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border">
                <th className="w-8 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="accent-primary w-3.5 h-3.5 cursor-pointer"
                    checked={selectedIds.length === fixtures.length && fixtures.length > 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
                <th className="px-3 py-2.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider w-24">Time</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Fixture</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {betTypeLabel}
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {fixtures.map((fixture) => (
                <FixtureRow
                  key={fixture.id}
                  fixture={fixture}
                  selected={selectedIds.includes(fixture.id)}
                  onSelect={(v) => toggleSelect(fixture.id, v)}
                  onViewMarkets={() => handleViewMarkets(fixture)}
                  onAddSelection={handleAddSelection}
                  activeBetType={activeBetType}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 shrink-0 text-[10px] font-mono text-muted-foreground">
          <span>Page {page} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              icon={<ChevronLeft size={12} />}
            >
              Prev
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight size={12} />
            </Button>
          </div>
        </div>
      )}

      {/* Market Browser Modal */}
      <MarketBrowser
        open={marketBrowserOpen}
        onClose={() => { setMarketBrowserOpen(false); setSelectedFixtureSlug(null); }}
        fixture={selectedFixtureSlug}
        sportSlug={activeSport}
      />
    </div>
  );
}
