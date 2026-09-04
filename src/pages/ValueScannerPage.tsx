/**
 * ValueScannerPage — dedicated page for scanning fixtures with unrealistic odds gaps.
 * Composes ScannerFilterBar, ScannerResultRow, and OddsGapBadge.
 * Includes ErrorBoundary wrapper, toast integration, and intelligent empty states.
 * @module pages/ValueScannerPage
 */

import { useState, useCallback } from "react";
import { useValueScanner } from "@/hooks/useValueScanner";
import { usePool } from "@/hooks/usePool";
import { scannerOutcomeToPoolFixture } from "@/lib/betarchitect/toPoolFixture";
import ScannerFilterBar, { type ScannerFilters } from "@/components/scanner/ScannerFilterBar";
import ScannerResultRow from "@/components/scanner/ScannerResultRow";
import type { FlaggedMarket } from "@/lib/scanner/types";
import { Button, Skeleton } from "@/components/ui";
import { ScannerErrorBoundary } from "@/lib/scanner/errors";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSlipStore } from "@/store/useSlipStore";
import { useUIStore } from "@/store/useUIStore";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import { RefreshCw, Search, Zap, Settings, AlertTriangle, Radio } from "lucide-react";

const DEFAULT_FILTERS: ScannerFilters = {
  sport: "soccer",
  minGapRatio: 5,
  outcomeCount: null,
  dateFrom: null,
  dateTo: null,
  marketType: "",
};

export default function ValueScannerPage() {
  const [filters, setFilters] = useState<ScannerFilters>(DEFAULT_FILTERS);
  const apiToken = useSettingsStore((s) => s.apiToken);
  const addSelection = useSlipStore((s) => s.addSelection);
  const toggleSlip = useUIStore((s) => s.toggleSlip);
  const onNavigate = useUIStore((s) => s.openModal);
  const addToast = useUIStore((s) => s.addToast);
  const { addToPool } = usePool();

  const {
    flaggedResults,
    failedFixtures,
    isLoading,
    phase,
    error,
    totalFixtures,
    totalFlaggedMarkets,
    availableMarketNames,
    refetch,
  } = useValueScanner(
    filters.sport,
    filters.minGapRatio,
    filters.outcomeCount,
    filters.dateFrom,
    filters.dateTo,
    filters.marketType,
  );

  const handleAddSelection = useCallback(
    (sel: BetSelection) => {
      addSelection(sel);
      toggleSlip(true);
    },
    [addSelection, toggleSlip],
  );

  const handleAddToPool = useCallback(
    (fixture: DiscoveryFixture, flagged: FlaggedMarket, outcome: StakeMarketOutcome) => {
      const poolFixture = scannerOutcomeToPoolFixture(fixture, flagged, outcome);
      if (!poolFixture) {
        addToast({
          type: "warning",
          title: "Cannot add to pool",
          description: "This outcome has no valid ID for bet placement.",
        });
        return;
      }
      addToPool(poolFixture);
      addToast({
        type: "success",
        title: "Added to BetArchitect pool",
        description: `${outcome.name} @ ${outcome.odds} — ${fixture.name}`,
      });
    },
    [addToPool, addToast],
  );

  const handleFilterChange = useCallback((partial: Partial<ScannerFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  // ─── No API Token ──────────────────────────────────────────────────

  if (!apiToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-8">
        <div className="max-w-md text-center">
          <Settings size={32} className="mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-mono font-semibold mb-2">API Token Required</h2>
          <p className="text-muted-foreground text-xs font-mono mb-4">
            Set your API token in Settings to scan fixtures for odds gaps.
          </p>
          <p className="text-muted-foreground/60 text-[10px] font-mono">
            Go to Settings → API Configuration
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase indicator ───────────────────────────────────────────────

  const phaseLabel =
    phase === "fetching"
      ? "Fetching fixtures..."
      : phase === "enriching"
        ? "Loading market data..."
        : phase === "analyzing"
          ? "Analyzing odds..."
          : "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter Bar */}
      <ScannerFilterBar
        filters={filters}
        onChange={handleFilterChange}
        availableMarkets={availableMarketNames}
      />

      {/* Status Bar */}
      <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50 shrink-0 text-[10px] font-mono text-muted-foreground">
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw size={9} className="animate-spin" />
            {phaseLabel}
          </span>
        ) : (
          <>
            <span>{totalFixtures} fixtures scanned</span>
            {totalFlaggedMarkets > 0 && (
              <span className="flex items-center gap-1">
                <Zap size={9} className="text-primary" />
                <span className="text-primary">{totalFlaggedMarkets} flagged</span>
              </span>
            )}
            {flaggedResults.length > 0 && <span>{flaggedResults.length} matches</span>}
            {failedFixtures.length > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertTriangle size={9} />
                {failedFixtures.length} failed
              </span>
            )}
          </>
        )}
        <div className="ml-auto">
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-center">
          <p className="text-xs font-mono text-red-400">{error}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
            Retry
          </Button>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {isLoading && flaggedResults.length === 0 ? (
          /* Loading skeletons */
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-3 h-3 rounded" />
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : flaggedResults.length === 0 && !error ? (
          /* Empty states */
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            {totalFixtures === 0 && !isLoading ? (
              <>
                <Search size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="text-sm font-mono font-medium text-muted-foreground mb-1">
                  No fixtures found
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground/60 max-w-xs">
                  No {filters.sport} fixtures available for the selected date range. Try a different
                  sport or widen the date range.
                </p>
              </>
            ) : (
              <>
                <Radio size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                <h3 className="text-sm font-mono font-medium text-muted-foreground mb-1">
                  No odds gaps found
                </h3>
                <p className="text-[10px] font-mono text-muted-foreground/60 max-w-xs">
                  No markets exceed the {filters.minGapRatio}x gap threshold. Try lowering the
                  threshold or changing the outcome count filter.
                </p>
              </>
            )}
          </div>
        ) : (
          /* Results list */
          <div>
            {flaggedResults.map((result) => (
              <ScannerResultRow
                key={result.fixture.id}
                fixture={result.fixture}
                flaggedMarkets={result.flaggedMarkets}
                onAddSelection={handleAddSelection}
                onAddToPool={(flagged, outcome) =>
                  handleAddToPool(result.fixture, flagged, outcome)
                }
              />
            ))}

            {/* Failed fixtures (collapsed at bottom) */}
            {failedFixtures.length > 0 && (
              <div className="border-t border-border/50">
                <div className="px-4 py-1.5 text-[10px] font-mono text-muted-foreground">
                  Failed fixtures ({failedFixtures.length})
                </div>
                {failedFixtures.map((f) => (
                  <ScannerResultRow
                    key={f.fixtureId}
                    fixture={{
                      id: f.fixtureId,
                      name: f.fixtureSlug ?? f.fixtureId,
                      slug: f.fixtureSlug ?? "",
                      startTime: "",
                      status: "unknown",
                      isLive: false,
                      tournament: { name: "", slug: "", category: { name: "", slug: "" } },
                      competitors: [],
                      previewMarkets: [],
                    }}
                    flaggedMarkets={[]}
                    failed
                    errorMessage={f.error}
                    onAddSelection={handleAddSelection}
                    onAddToPool={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wrapped version with ErrorBoundary — used by App.tsx.
 */
export function ValueScannerPageWithErrorBoundary() {
  return (
    <ScannerErrorBoundary>
      <ValueScannerPage />
    </ScannerErrorBoundary>
  );
}
