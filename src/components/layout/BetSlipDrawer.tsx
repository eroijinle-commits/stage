import { useUIStore } from "@/store/useUIStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBetSlip } from "@/hooks/useBetSlip";
import { cn } from "@/lib/utils/cn";
import { X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import SlipItem from "@/components/slip/SlipItem";
import { useState } from "react";

export default function BetSlipDrawer() {
  const slipOpen = useUIStore((s) => s.slipOpen);
  const toggleSlip = useUIStore((s) => s.toggleSlip);
  const currency = useSettingsStore((s) => s.currency);

  const {
    selections,
    mode,
    stakePerLeg,
    isPlacing,
    placeResults,
    potentialReturn,
    setMode,
    setStakePerLeg,
    removeSelection,
    clearSelections,
    placeBets,
  } = useBetSlip();

  const [stakes, setStakes] = useState<Record<string, number>>({});

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
            {selections.length > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                {selections.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selections.length > 0 && (
              <button
                onClick={clearSelections}
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

        {selections.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs font-mono text-muted-foreground text-center px-6">
            Add selections from the discovery table to build your slip.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border shrink-0">
              {(["singles", "parlay"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
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

            <div className="p-3 border-t border-border space-y-3 shrink-0">
              {mode === "parlay" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>Total Odds</span>
                    <span className="text-foreground tabular-nums">
                      {totalOdds.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span>Stake ({currency})</span>
                  </div>
                  <input
                    type="number"
                    value={stakePerLeg}
                    onChange={(e) =>
                      setStakePerLeg(parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-right focus:outline-none focus:border-ring"
                  />
                </div>
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
                  {currency} {Math.round(displayReturn).toLocaleString("en-NG")}
                </span>
              </div>
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
          </>
        )}
      </div>
    </>
  );
}
