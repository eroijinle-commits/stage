import { useUIStore } from "@/store/useUIStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { cn } from "@/lib/utils/cn";
import { getShieldFeeRate, calculatePotentialReturn, calculateTotalStake } from "@/lib/state/slipLogic";
import { X, Trash2, Share2, Save, FolderOpen, ChevronDown, ChevronUp, Copy, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import SlipItem from "@/components/slip/SlipItem";
import { useState, useCallback } from "react";
import type { ComputeSlipEntry } from "@/store/useSlipStore";
import type { SlipMode } from "@/lib/contracts/db.contract";

// ─── Compute Slip Card ──────────────────────────────────────────────────────

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

  const totalOdds = slip.selections.reduce((acc, s) => acc * s.odds, 1);
  const potentialReturn = calculatePotentialReturn(
    slip.selections,
    slip.mode,
    slip.stakePerLeg,
    undefined,
    slip.stakeShieldEnabled,
  );
  const totalStake = calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
  const placed = slip.placeResults.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-secondary/50">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-mono font-semibold text-foreground hover:text-primary transition-colors"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {slip.name}
          <span className="text-muted-foreground font-normal">({slip.selections.length} legs)</span>
        </button>
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-bet-lost transition-colors p-0.5"
          title="Remove slip"
        >
          <X size={12} />
        </button>
      </div>

      {expanded && (
        <>
          {/* Mode toggle */}
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border">
            {(["singles", "parlay"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  updateComputeSlip(slip.id, {
                    mode: m,
                    stakeShieldEnabled: m !== "parlay" ? false : slip.stakeShieldEnabled,
                  });
                }}
                className={cn(
                  "flex-1 py-0.5 text-[10px] font-mono rounded transition-colors capitalize",
                  slip.mode === m
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Stake Shield for parlay with 3+ legs */}
          {slip.mode === "parlay" && slip.selections.length >= 3 && (
            <div className="px-3 py-1.5 border-b border-border">
              <button
                onClick={() => updateComputeSlip(slip.id, { stakeShieldEnabled: !slip.stakeShieldEnabled })}
                className={cn(
                  "w-full flex items-center justify-between py-1 px-2 rounded text-[10px] font-mono transition-colors",
                  slip.stakeShieldEnabled
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent",
                )}
              >
                <span className="flex items-center gap-1">
                  <span>🛡️</span>
                  <span>Stake Shield</span>
                </span>
                <span className={cn(
                  "w-6 h-3.5 rounded-full transition-colors relative",
                  slip.stakeShieldEnabled ? "bg-primary" : "bg-muted",
                )}>
                  <span className={cn(
                    "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform",
                    slip.stakeShieldEnabled ? "translate-x-3" : "translate-x-0.5",
                  )} />
                </span>
              </button>
            </div>
          )}

          {/* Selections */}
          <div className="p-2 space-y-1.5 max-h-40 overflow-y-auto">
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
          <div className="px-3 py-2 border-t border-border space-y-1.5">
            {slip.mode === "parlay" && (
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Total Odds</span>
                <span className="text-foreground tabular-nums">{totalOdds.toFixed(2)}</span>
              </div>
            )}
            {slip.mode === "parlay" && (
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                <span>Stake ({currency})</span>
              </div>
            )}
            {slip.mode === "parlay" && (
              <input
                type="number"
                value={slip.stakePerLeg}
                onChange={(e) => updateComputeSlip(slip.id, { stakePerLeg: parseFloat(e.target.value) || 0 })}
                className="w-full bg-secondary border border-border rounded px-2 py-1 text-[10px] font-mono text-right focus:outline-none focus:border-ring"
              />
            )}
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-muted-foreground">Total Stake</span>
              <span className="text-foreground tabular-nums">
                {currency} {totalStake.toLocaleString("en-NG")}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="text-muted-foreground">Potential Return</span>
              <span className="text-primary tabular-nums">
                {currency} {potentialReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {slip.lastError && (
              <div className="text-[10px] font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-2 py-1">
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
              <div className="text-[10px] font-mono text-bet-won text-center py-1">
                {slip.placeResults.filter((r) => r.success).length > 0
                  ? `Placed · ${slip.placeResults.filter((r) => r.success).length} bet(s) successful`
                  : "Bet placement completed"}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Drawer ────────────────────────────────────────────────────────────

export default function BetSlipDrawer() {
  const slipOpen = useUIStore((s) => s.slipOpen);
  const toggleSlip = useUIStore((s) => s.toggleSlip);
  const currency = useSettingsStore((s) => s.currency);

  const {
    selections,
    mode,
    stakePerLeg,
    stakeShieldEnabled,
    isPlacing,
    placeResults,
    potentialReturn,
    lastError,
    setMode,
    setStakePerLeg,
    setStakeShieldEnabled,
    removeSelection,
    clearSelections,
    placeBets,
    // Compute slip isolation
    computeSlips,
    removeComputeSlip,
    clearComputeSlips,
    placeBetsForGroup,
  } = useBetSlip();

  const shareSlip = useSlipStore((s) => s.shareSlip);
  const saveSlip = useSlipStore((s) => s.saveSlip);
  const loadSlip = useSlipStore((s) => s.loadSlip);
  const deleteSlip = useSlipStore((s) => s.deleteSlip);
  const savedSlips = useSlipStore((s) => s.savedSlips);

  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSavedSlips, setShowSavedSlips] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const totalStake =
    mode === "singles"
      ? selections.reduce((acc, s) => acc + (stakes[s.id] ?? stakePerLeg), 0)
      : stakePerLeg;

  const displayReturn =
    mode === "singles"
      ? selections.reduce(
        (acc, s) => acc + (stakes[s.id] ?? stakePerLeg) * s.odds,
        0,
      )
      : potentialReturn;

  const placed = placeResults.length > 0;

  const totalCount = selections.length + computeSlips.reduce((acc, cs) => acc + cs.selections.length, 0);

  const handleShare = useCallback(() => {
    const data = shareSlip();
    if (!data) return;

    const text = data.link
      ? `${data.code}\nStake fixture: ${data.link}\nRestore in Stage: ${data.stageLink}`
      : data.stageLink;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      prompt("Copy this slip:", text);
    });
  }, [shareSlip]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    saveSlip(saveName.trim());
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, saveSlip]);

  const hasContent = selections.length > 0 || computeSlips.length > 0;

  return (
    <>
      {slipOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={() => toggleSlip(false)}
        />
      )}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-40 flex flex-col transition-transform duration-250",
          slipOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold">Bet Slip</span>
            {totalCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {totalCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selections.length > 0 && !placed && (
              <>
                <button
                  onClick={handleShare}
                  className="text-muted-foreground hover:text-primary transition-colors p-1" title="Copy bet slip"
                >
                  {copied ? <Check size={13} className="text-bet-won" /> : <Share2 size={13} />}
                </button>
                <button
                  onClick={() => setShowSaveInput((v) => !v)}
                  className="text-muted-foreground hover:text-primary transition-colors p-1" title="Save slip"
                >
                  <Save size={13} />
                </button>
              </>
            )}
            {hasContent && (
              <button
                onClick={() => { clearSelections(); clearComputeSlips(); }}
                className="text-muted-foreground hover:text-bet-lost transition-colors p-1"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button
              onClick={() => toggleSlip(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Save input */}
        {showSaveInput && (
          <div className="px-3 py-2 border-b border-border shrink-0 flex gap-1.5">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="Slip name…"
              className="flex-1 bg-secondary border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-ring"
              autoFocus
            />
            <Button variant="primary" onClick={handleSave} disabled={!saveName.trim()}>
              Save
            </Button>
          </div>
        )}

        {/* Saved slips */}
        {savedSlips.length > 0 && (
          <div className="border-b border-border shrink-0">
            <button
              onClick={() => setShowSavedSlips((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FolderOpen size={11} />
                Saved Slips ({savedSlips.length})
              </span>
              {showSavedSlips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {showSavedSlips && (
              <div className="px-3 pb-2 space-y-1 max-h-40 overflow-y-auto">
                {savedSlips.map((slip) => (
                  <div key={slip.id} className="flex items-center justify-between gap-2 py-1 px-2 rounded bg-secondary/50 text-[10px] font-mono">
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground truncate block">{slip.name}</span>
                      <span className="text-muted-foreground">{slip.selections.length} leg{slip.selections.length !== 1 ? "s" : ""} · {slip.mode}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { loadSlip(slip.id); setShowSavedSlips(false); }} className="text-primary hover:text-primary/80 transition-colors px-1">Load</button>
                      <button onClick={() => deleteSlip(slip.id)} className="text-bet-lost/60 hover:text-bet-lost transition-colors px-1">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasContent ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono text-muted-foreground text-center px-6">
            Add selections from the discovery table or compute slips to build your slip.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* ── Manual Slip Section ──────────────────────────────────── */}
            {selections.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Manual Slip</span>
                </div>

                <div className="flex items-center gap-1">
                  {(["singles", "parlay"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        if (m !== "parlay") setStakeShieldEnabled(false);
                      }}
                      className={cn(
                        "flex-1 py-1 text-xs font-mono rounded transition-colors capitalize",
                        mode === m
                          ? "bg-primary/10 text-primary border border-primary/30"
                          : "text-muted-foreground hover:bg-muted border border-transparent",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {mode === "parlay" && selections.length >= 3 && (
                  <div className="py-1">
                    <button
                      onClick={() => setStakeShieldEnabled(!stakeShieldEnabled)}
                      className={cn(
                        "w-full flex items-center justify-between py-1.5 px-2.5 rounded text-xs font-mono transition-colors",
                        stakeShieldEnabled
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
                        stakeShieldEnabled ? "bg-primary" : "bg-muted",
                      )}>
                        <span className={cn(
                          "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                          stakeShieldEnabled ? "translate-x-3.5" : "translate-x-0.5",
                        )} />
                      </span>
                    </button>
                    {stakeShieldEnabled && (
                      <div className="mt-1 px-2.5 text-[10px] font-mono text-muted-foreground">
                        <span className="text-primary/70">🛡️</span> Fee: {(getShieldFeeRate(selections.length) * 100).toFixed(0)}% — potential return reduced
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  {selections.map((s) => {
                    const result = placeResults.find((r) => r.selectionId === s.id);
                    return (
                      <SlipItem
                        key={s.id}
                        selection={s}
                        onRemove={() => removeSelection(s.id)}
                        stake={stakes[s.id] ?? stakePerLeg}
                        onStakeChange={(v) =>
                          setStakes((prev) => ({ ...prev, [s.id]: v }))
                        }
                        mode={mode}
                        result={result}
                      />
                    );
                  })}
                </div>

                <div className="space-y-2 pt-1">
                  {mode === "parlay" && (
                    <>
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>Total Odds</span>
                        <span className="text-foreground tabular-nums">{totalOdds.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                        <span>Stake ({currency})</span>
                      </div>
                      <input
                        type="number"
                        value={stakePerLeg}
                        onChange={(e) => setStakePerLeg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-right focus:outline-none focus:border-ring"
                      />
                    </>
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
                      {currency} {displayReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {!placed && lastError && (
                    <div className="text-xs font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-2.5 py-1.5">
                      {lastError}
                    </div>
                  )}
                  {!placed ? (
                    <Button
                      variant="primary"
                      fullWidth
                      onClick={placeBets}
                      loading={isPlacing}
                      disabled={isPlacing || selections.length === 0}
                    >
                      {isPlacing
                        ? "Placing Bets..."
                        : `Place ${selections.length} Bet${selections.length !== 1 ? "s" : ""}`}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      fullWidth
                      onClick={clearSelections}
                    >
                      Clear Slip
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ── Compute Slips Section ───────────────────────────────── */}
            {computeSlips.length > 0 && (
              <div className="space-y-2">
                {selections.length > 0 && (
                  <div className="flex items-center justify-between px-1 pt-2 border-t border-border">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      Compute Slips ({computeSlips.length})
                    </span>
                    <button
                      onClick={clearComputeSlips}
                      className="text-[10px] font-mono text-muted-foreground hover:text-bet-lost transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}

                {computeSlips.map((slip) => (
                  <ComputeSlipCard
                    key={slip.id}
                    slip={slip}
                    currency={currency}
                    onRemove={() => removeComputeSlip(slip.id)}
                    onPlaceBets={placeBetsForGroup}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
