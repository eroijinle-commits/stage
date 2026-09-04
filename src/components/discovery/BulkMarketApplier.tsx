/**
 * BulkMarketApplier — bulk toolbar that finds common markets across selected
 * fixtures and lets the user apply the same market to all.
 *
 * Supports:
 * - Line-based bet types: Over/Under direction toggle
 * - Non-line bet types: dropdown to pick any available outcome
 * - Common Markets: cross-fixture market intersection
 * @module components/discovery/BulkMarketApplier
 */

import { useState, useMemo, useCallback } from "react";
import { DiscoveryFixture, BetSelection, BetTypeConfig } from "@/lib/contracts/ui.contract";
import { Button, Modal } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { CheckCircle, XCircle, Plus, Zap, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

interface BulkMarketApplierProps {
  selectedFixtures: DiscoveryFixture[];
  activeBetType: BetTypeConfig | null;
  betTypeLine: string | null;
  onAddSelections: (selections: BetSelection[]) => void;
  onClearSelection: () => void;
}

type OutcomeDirection = "over" | "under";

/**
 * Resolve which outcome to use based on the user's direction choice.
 */
function resolveOutcome(
  info: NonNullable<DiscoveryFixture["betTypeInfo"]>,
  direction: OutcomeDirection | null,
  specificOutcomeId: string | null,
): { id: string; name: string; odds: number; active: boolean } | null {
  // If a specific outcome was picked from the full list, use it directly
  if (specificOutcomeId) {
    if (info.overOutcome?.id === specificOutcomeId) return info.overOutcome;
    if (info.underOutcome?.id === specificOutcomeId) return info.underOutcome;
    const fromAll = info.allOutcomes?.find((o) => o.id === specificOutcomeId);
    if (fromAll) return fromAll;
    if (info.singleOutcome?.id === specificOutcomeId) return info.singleOutcome;
  }

  // Line-based: use direction toggle
  if (info.overOutcome && info.underOutcome) {
    if (direction === "under") return info.underOutcome;
    return info.overOutcome; // default to over
  }

  // Fallback: first available
  return (
    info.overOutcome ?? info.underOutcome ?? info.singleOutcome ?? info.allOutcomes?.[0] ?? null
  );
}

/**
 * Build a BetSelection from a fixture and its betTypeInfo.
 */
function buildSelectionFromFixture(
  fixture: DiscoveryFixture,
  info: NonNullable<DiscoveryFixture["betTypeInfo"]>,
  direction: OutcomeDirection | null,
  specificOutcomeId: string | null,
): BetSelection | null {
  const outcome = resolveOutcome(info, direction, specificOutcomeId);
  if (!outcome) return null;
  // Reject outcomes with empty IDs — the Stake API requires valid UUIDs.
  if (!outcome.id || outcome.id.trim() === "") return null;
  return {
    id: outcome.id,
    fixtureSlug: fixture.slug,
    fixtureName: fixture.name,
    fixtureId: fixture.id,
    tournamentName: fixture.tournament.name,
    marketId: `${fixture.id}-${info.betTypeName}`,
    marketName: info.betTypeName + (info.line ? ` ${info.line}` : ""),
    outcomeId: outcome.id,
    outcomeName: outcome.name,
    odds: outcome.odds,
    active: outcome.active,
    startTime: fixture.startTime,
    addedAt: Date.now(),
    betType: info.betTypeName,
    betTypeLine: info.line,
    sport: fixture.sport,
    stakeUrl: fixture.stakeUrl,
  };
}

/**
 * Get the display preview outcome for a fixture given the current direction/outcome selection.
 */
function getPreviewOutcome(
  info: NonNullable<DiscoveryFixture["betTypeInfo"]>,
  direction: OutcomeDirection | null,
  specificOutcomeId: string | null,
) {
  return resolveOutcome(info, direction, specificOutcomeId);
}

export default function BulkMarketApplier({
  selectedFixtures,
  activeBetType,
  betTypeLine,
  onAddSelections,
  onClearSelection,
}: BulkMarketApplierProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [outcomeDirection, setOutcomeDirection] = useState<OutcomeDirection | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string | null>(null);
  const [showOutcomePicker, setShowOutcomePicker] = useState(false);
  const addToast = useUIStore((s) => s.addToast);

  if (selectedFixtures.length === 0) return null;

  const available = selectedFixtures.filter((f) => f.betTypeInfo?.available);
  const unavailable = selectedFixtures.filter((f) => f.betTypeInfo && !f.betTypeInfo.available);

  const hasLines = activeBetType?.hasLines ?? false;

  // Collect all unique outcomes across available fixtures (for non-line bet types)
  const allAvailableOutcomes = useMemo(() => {
    if (hasLines) return [];
    const map = new Map<string, { name: string; odds: number; active: boolean; id: string }>();
    available.forEach((f) => {
      const info = f.betTypeInfo;
      if (!info) return;
      if (info.overOutcome) map.set(info.overOutcome.id, info.overOutcome);
      if (info.underOutcome) map.set(info.underOutcome.id, info.underOutcome);
      if (info.allOutcomes) info.allOutcomes.forEach((o) => map.set(o.id, o));
      if (info.singleOutcome) map.set(info.singleOutcome.id, info.singleOutcome);
    });
    return [...map.values()];
  }, [available, hasLines]);

  // Build list of common market names across ALL selected fixtures
  const commonMarkets = useMemo(() => {
    if (selectedFixtures.length < 2) return [];
    const marketSets = selectedFixtures
      .filter((f) => f.betTypeInfo?.available)
      .map((f) => {
        const info = f.betTypeInfo!;
        const names = new Set<string>();
        if (info.overOutcome) names.add(`${info.betTypeName} Over ${info.line}`);
        if (info.underOutcome) names.add(`${info.betTypeName} Under ${info.line}`);
        if (info.allOutcomes)
          info.allOutcomes.forEach((o) => names.add(`${info.betTypeName} ${o.name}`));
        if (info.singleOutcome) names.add(`${info.betTypeName} ${info.singleOutcome.name}`);
        return names;
      });

    if (marketSets.length === 0) return [];
    return [...marketSets[0]].filter((name) => marketSets.every((s) => s.has(name)));
  }, [selectedFixtures]);

  const handleApplyAll = useCallback(() => {
    const sels: BetSelection[] = [];
    available.forEach((f) => {
      const info = f.betTypeInfo;
      if (!info?.available) return;
      const sel = buildSelectionFromFixture(f, info, outcomeDirection, selectedOutcomeId);
      if (sel) sels.push(sel);
    });
    if (sels.length > 0) {
      onAddSelections(sels);
      addToast({
        type: "success",
        title: `Added ${sels.length} selection${sels.length > 1 ? "s" : ""} to slip`,
      });
    }
  }, [available, outcomeDirection, selectedOutcomeId, onAddSelections, addToast]);

  const handleApplySpecificMarket = useCallback(() => {
    if (!selectedMarket) return;
    const sels: BetSelection[] = [];
    available.forEach((f) => {
      const info = f.betTypeInfo;
      if (!info?.available) return;
      const sel = buildSelectionFromFixture(f, info, outcomeDirection, selectedOutcomeId);
      if (sel) sels.push(sel);
    });
    if (sels.length > 0) {
      onAddSelections(sels);
      addToast({
        type: "success",
        title: `Applied "${selectedMarket}" to ${sels.length} match${sels.length > 1 ? "es" : ""}`,
      });
    }
    setSelectedMarket(null);
    setShowConfirm(false);
  }, [selectedMarket, available, outcomeDirection, selectedOutcomeId, onAddSelections, addToast]);

  // Build the label for the primary action button
  const buildButtonLabel = () => {
    if (!activeBetType) return "selected bet type";
    const base = activeBetType.name;
    if (hasLines && betTypeLine) {
      const dir = outcomeDirection === "under" ? "Under" : "Over";
      return `${base} ${dir} ${betTypeLine}`;
    }
    if (!hasLines && selectedOutcomeId) {
      const selOutcome = allAvailableOutcomes.find((o) => o.id === selectedOutcomeId);
      if (selOutcome) return `${base} — ${selOutcome.name}`;
    }
    return base + (betTypeLine ? ` ${betTypeLine}` : "");
  };

  const buttonLabel = buildButtonLabel();

  // Preview outcome for the fixture list
  const previewOutcomeFor = (info: NonNullable<DiscoveryFixture["betTypeInfo"]>) =>
    getPreviewOutcome(info, outcomeDirection, selectedOutcomeId);

  return (
    <div className="px-4 py-2 border-b border-border bg-secondary/50 shrink-0">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono text-foreground">
          <span className="text-primary font-semibold">{selectedFixtures.length}</span> selected
        </span>

        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1 text-bet-won">
            <CheckCircle size={10} />
            {available.length} available
          </span>
          {unavailable.length > 0 && (
            <span className="flex items-center gap-1 text-bet-lost">
              <XCircle size={10} />
              {unavailable.length} unavailable
            </span>
          )}
        </div>

        {/* ── Outcome Direction Toggle (line-based bet types) ── */}
        {hasLines && activeBetType && (
          <div className="flex items-center gap-1 border border-border rounded overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setOutcomeDirection(outcomeDirection === "over" ? null : "over");
                setSelectedOutcomeId(null);
              }}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono transition-colors",
                outcomeDirection === "over"
                  ? "bg-odds-up/15 text-odds-up"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <ArrowUp size={10} />
              Over
            </button>
            <div className="w-px h-4 bg-border" />
            <button
              type="button"
              onClick={() => {
                setOutcomeDirection(outcomeDirection === "under" ? null : "under");
                setSelectedOutcomeId(null);
              }}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono transition-colors",
                outcomeDirection === "under"
                  ? "bg-odds-down/15 text-odds-down"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <ArrowDown size={10} />
              Under
            </button>
          </div>
        )}

        {/* ── Outcome Picker (non-line bet types with multiple outcomes) ── */}
        {!hasLines && allAvailableOutcomes.length > 1 && (
          <div className="relative">
            <Button
              variant={selectedOutcomeId ? "primary" : "outline"}
              size="sm"
              onClick={() => setShowOutcomePicker(!showOutcomePicker)}
            >
              {selectedOutcomeId
                ? (allAvailableOutcomes.find((o) => o.id === selectedOutcomeId)?.name ??
                  "Pick Outcome")
                : "Pick Outcome"}
              <ChevronDown
                size={10}
                className={cn("transition-transform ml-1", showOutcomePicker && "rotate-180")}
              />
            </Button>
            {showOutcomePicker && (
              <div className="absolute z-50 mt-1 w-56 bg-card border border-border rounded shadow-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOutcomeId(null);
                    setShowOutcomePicker(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs font-mono hover:bg-muted transition-colors",
                    !selectedOutcomeId && "text-primary bg-primary/5",
                  )}
                >
                  Auto (first available)
                </button>
                {allAvailableOutcomes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      setSelectedOutcomeId(o.id);
                      setShowOutcomePicker(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-mono hover:bg-muted transition-colors flex items-center justify-between",
                      selectedOutcomeId === o.id && "text-primary bg-primary/5",
                    )}
                  >
                    <span>{o.name}</span>
                    <span className="text-muted-foreground tabular-nums">@{o.odds.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Quick apply with active bet type ── */}
        {activeBetType && (
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={12} />}
            onClick={handleApplyAll}
            disabled={available.length === 0}
          >
            Add {available.length} "{buttonLabel}" to Slip
          </Button>
        )}

        {/* ── Common markets dropdown ── */}
        {commonMarkets.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              icon={<Zap size={12} />}
              onClick={() => setShowDropdown(!showDropdown)}
            >
              Common Markets
              <ChevronDown
                size={10}
                className={cn("transition-transform", showDropdown && "rotate-180")}
              />
            </Button>
            {showDropdown && (
              <div className="absolute z-50 mt-1 w-64 bg-card border border-border rounded shadow-lg overflow-hidden">
                {commonMarkets.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => {
                      setSelectedMarket(market);
                      setShowConfirm(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-muted transition-colors text-foreground"
                  >
                    {market}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClearSelection}
          className="text-[10px] font-mono text-muted-foreground hover:text-foreground ml-auto transition-colors"
        >
          Clear selection
        </button>
      </div>

      {/* ── Selected fixtures preview (compact) ── */}
      {selectedFixtures.length <= 8 && (
        <div className="mt-2 space-y-1">
          {selectedFixtures.map((f) => {
            const info = f.betTypeInfo;
            const outcome = info?.available ? previewOutcomeFor(info) : null;
            return (
              <div
                key={f.id}
                className={cn(
                  "flex items-center justify-between text-[10px] font-mono py-1 px-2 rounded",
                  info?.available ? "bg-bet-won/5" : "bg-bet-lost/5",
                )}
              >
                <span className="text-muted-foreground truncate flex-1">{f.name}</span>
                {info?.available && outcome ? (
                  <span className="text-bet-won tabular-nums ml-4">
                    @{outcome.odds.toFixed(2)}{" "}
                    <span className="text-muted-foreground">({outcome.name})</span>
                  </span>
                ) : (
                  <span className="text-bet-lost ml-4">N/A</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {showConfirm && selectedMarket && (
        <Modal
          open={showConfirm}
          onClose={() => {
            setShowConfirm(false);
            setSelectedMarket(null);
          }}
          title="Confirm Bulk Apply"
          size="sm"
          actions={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedMarket(null);
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApplySpecificMarket}>
                Apply to {available.length} match{available.length > 1 ? "es" : ""}
              </Button>
            </>
          }
        >
          <div className="space-y-2">
            <p className="text-sm font-mono text-foreground">
              Apply <span className="text-primary font-semibold">"{selectedMarket}"</span> to{" "}
              <span className="text-primary font-semibold">{available.length}</span> match
              {available.length > 1 ? "es" : ""}?
            </p>
            <p className="text-xs font-mono text-muted-foreground">
              This will add one selection per match to your bet slip.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
