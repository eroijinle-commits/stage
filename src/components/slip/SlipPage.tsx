import { useState } from "react";
import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { calculatePotentialReturn, calculateTotalStake } from "@/lib/state/slipLogic";
import { X, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import SlipItem from "@/components/slip/SlipItem";
import SlipTabs, { type SlipTabId } from "@/components/slip/SlipTabs";
import SlipVariantA from "@/components/slip/SlipVariantA";
import type { ComputeSlipEntry } from "@/store/useSlipStore";

// ─── Compute Slip Card (full-width) ──────────────────────────────────────────

function ComputeSlipCard({
  slip,
  currency,
  onRemove,
  onPlaceBets,
}: {
  slip: ComputeSlipEntry;
  currency: string;
  onRemove: () => void;
  onPlaceBets: (id: string) => void;
}) {
  const updateComputeSlip = useSlipStore((s) => s.updateComputeSlip);
  const [expanded, setExpanded] = useState(true);

  const sameFixtureSelectionCount = (() => {
    const counts = new Map<string, number>();
    for (const s of slip.selections) counts.set(s.fixtureId, (counts.get(s.fixtureId) ?? 0) + 1);
    return Math.max(...counts.values());
  })();
  const canParlay = sameFixtureSelectionCount <= 1;

  const totalOdds = slip.selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = calculatePotentialReturn(slip.selections, slip.mode, slip.stakePerLeg, undefined, slip.stakeShieldEnabled);
  const totalStake = calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
  const placed = slip.placeResults.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/50">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-sm font-mono font-semibold text-foreground hover:text-primary transition-colors"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {slip.name}
          <span className="text-muted-foreground font-normal">({slip.selections.length} legs)</span>
        </button>
        <button onClick={onRemove} className="text-muted-foreground hover:text-bet-lost transition-colors p-1" title="Remove slip">
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <>
          {/* Mode toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
            {(["singles", "parlay"] as const).map((m) => {
              const disabled = m === "parlay" && !canParlay;
              return (
                <button
                  key={m}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    updateComputeSlip(slip.id, {
                      mode: m,
                      stakeShieldEnabled: m !== "parlay" ? false : slip.stakeShieldEnabled,
                    });
                  }}
                  title={disabled ? "Parlays cannot combine selections from the same match" : undefined}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-mono rounded transition-colors capitalize",
                    slip.mode === m
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : disabled
                        ? "text-muted-foreground/40 border border-transparent cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted border border-transparent",
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>

          {/* Stake Shield for parlay with 3+ legs */}
          {slip.mode === "parlay" && slip.selections.length >= 3 && (
            <div className="px-4 py-2 border-b border-border">
              <button
                onClick={() => updateComputeSlip(slip.id, { stakeShieldEnabled: !slip.stakeShieldEnabled })}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-3 rounded text-xs font-mono transition-colors",
                  slip.stakeShieldEnabled
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent",
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Stake Shield</span>
                </span>
                <span className={cn(
                  "w-7 h-4 rounded-full transition-colors relative",
                  slip.stakeShieldEnabled ? "bg-primary" : "bg-muted",
                )}>
                  <span className={cn(
                    "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                    slip.stakeShieldEnabled ? "translate-x-3.5" : "translate-x-0.5",
                  )} />
                </span>
              </button>
            </div>
          )}

          {/* Selections */}
          <div className="p-3 space-y-2">
            {slip.selections.map((s) => {
              const result = slip.placeResults.find((r) => r.selectionId === s.id);
              return (
                <SlipItem
                  key={s.id}
                  selection={s}
                  onRemove={() => {}}
                  mode={slip.mode}
                  result={result}
                />
              );
            })}
          </div>

          {/* Summary + Place */}
          <div className="px-4 py-3 border-t border-border space-y-2">
            {slip.mode === "parlay" && (
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Total Odds</span>
                <span className="text-foreground tabular-nums">{totalOdds.toFixed(2)}</span>
              </div>
            )}
            {slip.mode === "parlay" && (
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>Stake ({currency})</span>
              </div>
            )}
            {slip.mode === "parlay" && (
              <input
                type="number"
                value={slip.stakePerLeg}
                onChange={(e) => updateComputeSlip(slip.id, { stakePerLeg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-right focus:outline-none focus:border-ring"
              />
            )}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Total Stake</span>
              <span className="text-foreground tabular-nums">
                {currency} {totalStake.toLocaleString("en-NG")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-mono font-semibold">
              <span className="text-muted-foreground">Potential Return</span>
              <span className="text-primary tabular-nums">
                {currency} {potentialReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {slip.lastError && (
              <div className="text-xs font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-3 py-2">
                {slip.lastError}
              </div>
            )}
            {!placed ? (
              <Button
                variant="primary"
                fullWidth
                onClick={() => onPlaceBets(slip.id)}
                loading={slip.isPlacing}
                disabled={slip.isPlacing || slip.selections.length === 0}
              >
                {slip.isPlacing ? "Placing..." : "Place Bet"}
              </Button>
            ) : (
              <div className={cn(
                "text-xs font-mono text-center py-1.5",
                slip.placeResults.some((r) => r.success) ? "text-bet-won" : "text-bet-lost",
              )}>
                {slip.placeResults.some((r) => r.success)
                  ? `Placed · ${slip.placeResults.filter((r) => r.success).length} bet(s) successful`
                  : "Bet placement failed"}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── SlipPage ────────────────────────────────────────────────────────────────

export default function SlipPage() {
  const [activeTab, setActiveTab] = useState<SlipTabId>("manual");
  const { computeSlips, removeComputeSlip, placeBetsForGroup } = useBetSlip();
  const savedSlips = useSlipStore((s) => s.savedSlips);
  const loadSlip = useSlipStore((s) => s.loadSlip);
  const deleteSlip = useSlipStore((s) => s.deleteSlip);
  const currency = useSettingsStore((s) => s.currency);
  const selectionCount = useSlipStore((s) => s.selections.length);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SlipTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={{
          manual: selectionCount || undefined,
          compute: computeSlips.length || undefined,
          saved: savedSlips.length || undefined,
        }}
      />
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "manual" && <SlipVariantA />}

        {activeTab === "compute" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {computeSlips.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm font-mono text-muted-foreground">
                No compute slips. Generate permutations from the Compute panel.
              </div>
            ) : (
              computeSlips.map((slip) => (
                <ComputeSlipCard
                  key={slip.id}
                  slip={slip}
                  currency={currency}
                  onRemove={() => removeComputeSlip(slip.id)}
                  onPlaceBets={placeBetsForGroup}
                />
              ))
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {savedSlips.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm font-mono text-muted-foreground">
                No saved slips. Save your current slip from the Manual tab.
              </div>
            ) : (
              savedSlips.map((slip) => (
                <div key={slip.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono font-semibold text-foreground">{slip.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {slip.selections.length} leg{slip.selections.length !== 1 ? "s" : ""} · {slip.mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="primary" size="sm" onClick={() => { loadSlip(slip.id); setActiveTab("manual"); }}>
                        Load
                      </Button>
                      <button
                        onClick={() => deleteSlip(slip.id)}
                        className="text-muted-foreground hover:text-bet-lost transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {slip.selections.map((s) => (
                      <div key={s.id} className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span className="truncate">{s.outcomeName}</span>
                        <span className="text-foreground tabular-nums ml-2 shrink-0">{s.odds.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
