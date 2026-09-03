/**
 * Full modal panel for the compute feature.
 * Contains header, config controls, live counter, selected markets preview,
 * results list, and action buttons. Uses `useCompute(fixture)` for all state.
 * @module components/compute/ComputePanel
 */

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { useCompute } from "@/hooks/useCompute";
import ComputeControls from "./ComputeControls";
import ComputeSlipPreview from "./ComputeSlipPreview";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import type { ComputeSlip } from "@/lib/compute/types";
import { cn } from "@/lib/utils/cn";

const MAX_DISPLAY_SLIPS = 81;

interface ComputePanelProps {
  open: boolean;
  onClose: () => void;
  fixture: DiscoveryFixture | null;
}

export default function ComputePanel({ open, onClose, fixture }: ComputePanelProps) {
  const {
    config,
    setConfig,
    result,
    isLoading,
    error,
    permutationCount,
    availableSlipCounts,
    canGenerate,
    runCompute,
    addSlipToBetSlip,
    addSelectedSlips,
    addAllSlips,
    retry,
    clearError,
  } = useCompute(fixture);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when result changes
  const displayedSlips: ComputeSlip[] = useMemo(() => {
    if (!result) return [];
    setSelectedIds(new Set());
    return result.slips.slice(0, MAX_DISPLAY_SLIPS);
  }, [result]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = () => {
    addSelectedSlips([...selectedIds]);
    setSelectedIds(new Set());
  };

  const handleAddAll = () => {
    addAllSlips();
    setSelectedIds(new Set());
  };

  const handleAddSingle = (slip: ComputeSlip) => {
    addSlipToBetSlip(slip);
  };

  const description = fixture ? `${fixture.tournament?.name ?? "Unknown Tournament"}` : undefined;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={fixture?.name ?? "Compute"}
      description={description}
      size="xl"
      actions={
        result && result.slips.length > 0 ? (
          <>
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              data-testid="add-selected-button"
              className={cn(
                "px-3.5 py-1.5 text-xs font-mono font-semibold rounded transition-colors",
                "border border-border",
                selectedIds.size > 0
                  ? "bg-secondary text-secondary-foreground hover:bg-muted"
                  : "bg-secondary text-secondary-foreground opacity-40 cursor-not-allowed",
              )}
            >
              Add Selected ({selectedIds.size})
            </button>
            <button
              onClick={handleAddAll}
              data-testid="add-all-button"
              className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded bg-primary text-primary-foreground hover:bg-brand-400 active:bg-brand-600 transition-colors"
            >
              Add All ({result.slips.length})
            </button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto -mx-1 px-1">
        {/* Config controls */}
        <section>
          <ComputeControls
            config={config}
            onConfigChange={setConfig}
            permutationCount={permutationCount}
            availableSlipCounts={availableSlipCounts}
            canGenerate={canGenerate}
            onGenerate={runCompute}
            isLoading={isLoading}
            error={error}
          />
        </section>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
            ))}
          </div>
        )}

        {/* Selected markets preview (before generation) */}
        {result && result.selectedMarkets.length > 0 && (
          <section>
            <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Selected Markets
            </h3>
            <div className="space-y-1.5">
              {result.selectedMarkets.map((market) => (
                <div
                  key={market.market.id}
                  className="border border-border rounded p-2 text-xs font-mono flex items-center justify-between"
                >
                  <span className="text-muted-foreground truncate">{market.market.name}</span>
                  <span className="text-foreground tabular-nums ml-2 shrink-0">
                    {market.highestOdds.toFixed(2)} best
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state after generation */}
        {result && result.slips.length === 0 && !isLoading && (
          <div className="border border-border rounded p-4 text-center text-xs font-mono text-muted-foreground">
            No permutations could be generated. Try adjusting the configuration or check that
            markets have active outcomes.
          </div>
        )}

        {/* Results list */}
        {displayedSlips.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
                Generated Slips
              </h3>
              <span className="text-[10px] font-mono text-muted-foreground">
                {result!.totalPermutations} total
                {result!.totalPermutations > MAX_DISPLAY_SLIPS && ` · showing ${MAX_DISPLAY_SLIPS}`}
              </span>
            </div>
            <div className="space-y-2">
              {displayedSlips.map((slip, i) => (
                <ComputeSlipPreview
                  key={slip.id}
                  slip={slip}
                  index={i}
                  checked={selectedIds.has(slip.id)}
                  onToggle={toggleSelection}
                  onAdd={handleAddSingle}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}
