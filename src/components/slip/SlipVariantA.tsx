import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { getShieldFeeRate, calculatePotentialReturn, calculateTotalStake } from "@/lib/state/slipLogic";
import { Share2, Save, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui";
import SlipItem from "@/components/slip/SlipItem";
import { useState, useCallback } from "react";

export default function SlipVariantA() {
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
  } = useBetSlip();

  const shareSlip = useSlipStore((s) => s.shareSlip);
  const saveSlip = useSlipStore((s) => s.saveSlip);
  const currency = useSettingsStore((s) => s.currency);

  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [copied, setCopied] = useState(false);

  const totalOdds = selections.reduce((acc, s) => acc * s.odds, 1);
  const totalStake =
    mode === "singles"
      ? selections.reduce((acc, s) => acc + (stakes[s.id] ?? stakePerLeg), 0)
      : stakePerLeg;

  const displayReturn =
    mode === "singles"
      ? selections.reduce((acc, s) => acc + (stakes[s.id] ?? stakePerLeg) * s.odds, 0)
      : potentialReturn;

  const placed = placeResults.length > 0;

  const handleShare = useCallback(() => {
    const data = shareSlip();
    if (!data) return;
    const text = data.link
      ? `${data.code}\nStake fixture: ${data.link}\nRestore in Stage: ${data.stageLink}`
      : data.stageLink;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareSlip]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    saveSlip(saveName.trim());
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, saveSlip]);

  if (selections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm font-mono text-muted-foreground text-center px-6">
        No selections yet. Add bets from the Discovery page.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-mono font-semibold text-foreground">
          {selections.length} Selection{selections.length !== 1 ? "s" : ""}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            className="text-muted-foreground hover:text-primary transition-colors p-1.5"
            title="Copy slip"
          >
            {copied ? <Check size={14} className="text-bet-won" /> : <Share2 size={14} />}
          </button>
          <button
            onClick={() => setShowSaveInput((v) => !v)}
            className="text-muted-foreground hover:text-primary transition-colors p-1.5"
            title="Save slip"
          >
            <Save size={14} />
          </button>
          {!placed && (
            <button
              onClick={clearSelections}
              className="text-muted-foreground hover:text-bet-lost transition-colors p-1.5"
              title="Clear slip"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Save input */}
      {showSaveInput && (
        <div className="flex gap-2">
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Slip name…"
            className="flex-1 bg-secondary border border-border rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-ring"
            autoFocus
          />
          <Button variant="primary" onClick={handleSave} disabled={!saveName.trim()}>
            Save
          </Button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        {(["singles", "parlay"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              if (m !== "parlay") setStakeShieldEnabled(false);
            }}
            className={cn(
              "flex-1 py-2 text-xs font-mono rounded transition-colors capitalize",
              mode === m
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted border border-transparent",
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Stake Shield */}
      {mode === "parlay" && selections.length >= 3 && (
        <div>
          <button
            onClick={() => setStakeShieldEnabled(!stakeShieldEnabled)}
            className={cn(
              "w-full flex items-center justify-between py-2 px-3 rounded text-xs font-mono transition-colors",
              stakeShieldEnabled
                ? "bg-primary/10 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted border border-transparent",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Stake Shield</span>
            </span>
            <span
              className={cn(
                "w-7 h-4 rounded-full transition-colors relative",
                stakeShieldEnabled ? "bg-primary" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform",
                  stakeShieldEnabled ? "translate-x-3.5" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
          {stakeShieldEnabled && (
            <div className="mt-1 px-3 text-[10px] font-mono text-muted-foreground">
              <span className="text-primary/70">🛡️</span> Fee:{" "}
              {(getShieldFeeRate(selections.length) * 100).toFixed(0)}% — potential return reduced
            </div>
          )}
        </div>
      )}

      {/* Selections list */}
      <div className="space-y-2">
        {selections.map((s) => {
          const result = placeResults.find((r) => r.selectionId === s.id);
          return (
            <SlipItem
              key={s.id}
              selection={s}
              onRemove={() => removeSelection(s.id)}
              stake={stakes[s.id] ?? stakePerLeg}
              onStakeChange={(v) => setStakes((prev) => ({ ...prev, [s.id]: v }))}
              mode={mode}
              result={result}
            />
          );
        })}
      </div>

      {/* Summary + Place */}
      <div className="space-y-2 pt-2 border-t border-border">
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
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm font-mono text-right focus:outline-none focus:border-ring"
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
            {currency}{" "}
            {displayReturn.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {!placed && lastError && (
          <div className="text-xs font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-3 py-2">
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
          <Button variant="outline" fullWidth onClick={clearSelections}>
            Clear Slip
          </Button>
        )}
      </div>
    </div>
  );
}
