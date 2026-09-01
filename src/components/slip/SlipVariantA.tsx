import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { getShieldFeeRate } from "@/lib/state/slipLogic";
import { X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui";
import Badge from "@/components/ui/Badge";
import { useState, useMemo } from "react";
import type { BetSelection } from "@/lib/contracts/ui.contract";

type SortKey = "odds" | "time" | null;
type SortDir = "asc" | "desc";

function getStatus(result: { success: boolean } | undefined): "pending" | "placed" | "failed" {
  if (!result) return "pending";
  return result.success ? "placed" : "failed";
}

const STATUS_CONFIG = {
  pending: { variant: "warning" as const, label: "Pending" },
  placed: { variant: "success" as const, label: "Placed" },
  failed: { variant: "error" as const, label: "Failed" },
};

export default function SlipVariantA() {
  const {
    selections, mode, stakePerLeg, stakeShieldEnabled, isPlacing, placeResults,
    lastError, setMode, setStakePerLeg, setStakeShieldEnabled,
    removeSelection, clearSelections, placeBets,
  } = useBetSlip();

  const currency = useSettingsStore((s) => s.currency);
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [bulkStake, setBulkStake] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return selections;
    const copy = [...selections];
    copy.sort((a, b) => {
      const av = sortKey === "odds" ? a.odds : new Date(a.startTime).getTime();
      const bv = sortKey === "odds" ? b.odds : new Date(b.startTime).getTime();
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return copy;
  }, [selections, sortKey, sortDir]);

  const applyBulkStake = () => {
    const val = parseFloat(bulkStake);
    if (isNaN(val) || val <= 0) return;
    const map: Record<string, number> = {};
    for (const s of selections) map[s.id] = val;
    setStakes(map);
    setBulkStake("");
  };

  const getStake = (id: string) => stakes[id] ?? stakePerLeg;

  const totalOdds = selections.reduce((a, s) => a * s.odds, 1);
  const totalStake = mode === "singles"
    ? selections.reduce((a, s) => a + getStake(s.id), 0)
    : stakePerLeg;
  const displayReturn = mode === "singles"
    ? selections.reduce((a, s) => a + getStake(s.id) * s.odds, 0)
    : (() => {
        let r = stakePerLeg * totalOdds;
        if (stakeShieldEnabled && selections.length >= 3) r *= (1 - getShieldFeeRate(selections.length));
        return Math.round(r * 100) / 100;
      })();
  const potentialProfit = displayReturn - totalStake;
  const placedCount = placeResults.filter((r) => r.success).length;
  const failedCount = placeResults.filter((r) => !r.success).length;
  const placed = placeResults.length > 0;

  if (selections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm font-mono text-muted-foreground text-center px-6">
        No selections yet. Add bets from the Discovery page.
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Left: Selection Table ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Table header bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0">
          {/* Mode toggle */}
          <div className="flex items-center gap-1">
            {(["singles", "parlay"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); if (m !== "parlay") setStakeShieldEnabled(false); }}
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono rounded transition-colors capitalize",
                  mode === m
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent",
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Bulk stake — singles only */}
          {mode === "singles" && (
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] font-mono text-muted-foreground">Set all stakes:</span>
              <input
                type="number"
                value={bulkStake}
                onChange={(e) => setBulkStake(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyBulkStake()}
                placeholder={String(stakePerLeg)}
                className="w-20 bg-secondary border border-border rounded px-2 py-0.5 text-[10px] font-mono text-right focus:outline-none focus:border-ring"
              />
              <button
                onClick={applyBulkStake}
                className="text-[10px] font-mono text-primary hover:text-primary/80 transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 bg-card border-b border-border z-10">
              <tr className="text-muted-foreground">
                <th className="text-left px-4 py-2 font-medium">Fixture</th>
                <th className="text-left px-3 py-2 font-medium">Market / Selection</th>
                <th className="text-left px-3 py-2 font-medium">
                  <button onClick={() => toggleSort("odds")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Odds
                    {sortKey === "odds" ? (
                      sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-40" />
                    )}
                  </button>
                </th>
                <th className="text-right px-3 py-2 font-medium">Stake</th>
                <th className="text-right px-3 py-2 font-medium">Return</th>
                <th className="text-center px-3 py-2 font-medium">Status</th>
                <th className="w-8 px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {sorted.map((s) => {
                const result = placeResults.find((r) => r.selectionId === s.id);
                const status = getStatus(result);
                const stake = getStake(s.id);
                const rowReturn = stake * s.odds;

                return (
                  <tr
                    key={s.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      status === "placed" && "bg-bet-won/5",
                      status === "failed" && "bg-bet-lost/5",
                    )}
                  >
                    <td className="px-4 py-2 max-w-[180px]">
                      <p className="text-foreground truncate">{s.fixtureName}</p>
                      <p className="text-muted-foreground text-[10px] truncate">{s.tournamentName}</p>
                    </td>
                    <td className="px-3 py-2 max-w-[160px]">
                      <p className="text-foreground truncate">{s.outcomeName}</p>
                      <p className="text-muted-foreground text-[10px] truncate">{s.marketName}</p>
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-primary font-semibold tabular-nums">{s.odds.toFixed(2)}</span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {mode === "singles" && !result ? (
                        <input
                          type="number"
                          value={stakes[s.id] ?? stakePerLeg}
                          onChange={(e) => setStakes((prev) => ({ ...prev, [s.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 bg-secondary border border-border rounded px-2 py-0.5 text-[10px] font-mono text-right focus:outline-none focus:border-ring"
                        />
                      ) : (
                        <span className="text-foreground tabular-nums">{stake.toLocaleString("en-NG")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <span className="text-foreground tabular-nums">{rowReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant={STATUS_CONFIG[status].variant} size="sm">
                        {STATUS_CONFIG[status].label}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-center">
                      {!result && (
                        <button
                          onClick={() => removeSelection(s.id)}
                          className="text-muted-foreground hover:text-bet-lost transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Right: Summary Rail ────────────────────────────────────── */}
      <div className="w-56 shrink-0 border-l border-border bg-card flex flex-col overflow-y-auto">
        <div className="p-4 space-y-3 flex-1">
          {/* Mode */}
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Mode</div>
          <div className="text-sm font-mono font-semibold text-foreground capitalize">{mode}</div>

          {/* Selection count */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Selections</span>
            <span className="text-foreground tabular-nums">{selections.length}</span>
          </div>

          {/* Combined odds (parlay) */}
          {mode === "parlay" && (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Combined Odds</span>
              <span className="text-foreground tabular-nums">{totalOdds.toFixed(2)}</span>
            </div>
          )}

          <div className="border-t border-border" />

          {/* Stake */}
          {mode === "parlay" ? (
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-muted-foreground">Stake ({currency})</div>
              <input
                type="number"
                value={stakePerLeg}
                onChange={(e) => setStakePerLeg(parseFloat(e.target.value) || 0)}
                className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-xs font-mono text-right focus:outline-none focus:border-ring"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-muted-foreground">Total Stake</span>
              <span className="text-foreground tabular-nums">{currency} {totalStake.toLocaleString("en-NG")}</span>
            </div>
          )}

          {/* Potential Return */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Potential Return</span>
            <span className="text-primary font-semibold tabular-nums">
              {currency} {displayReturn.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Potential Profit */}
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Potential Profit</span>
            <span className={cn("font-semibold tabular-nums", potentialProfit >= 0 ? "text-bet-won" : "text-bet-lost")}>
              {currency} {potentialProfit.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Stake Shield */}
          {mode === "parlay" && selections.length >= 3 && (
            <>
              <div className="border-t border-border" />
              <button
                onClick={() => setStakeShieldEnabled(!stakeShieldEnabled)}
                className={cn(
                  "w-full flex items-center justify-between py-1.5 px-2 rounded text-[10px] font-mono transition-colors",
                  stakeShieldEnabled
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-muted border border-transparent",
                )}
              >
                <span className="flex items-center gap-1"><span>🛡️</span><span>Stake Shield</span></span>
                <span className={cn("w-6 h-3.5 rounded-full transition-colors relative", stakeShieldEnabled ? "bg-primary" : "bg-muted")}>
                  <span className={cn("absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform", stakeShieldEnabled ? "translate-x-3" : "translate-x-0.5")} />
                </span>
              </button>
              {stakeShieldEnabled && (
                <div className="text-[10px] font-mono text-muted-foreground">
                  Fee: {(getShieldFeeRate(selections.length) * 100).toFixed(0)}%
                </div>
              )}
            </>
          )}

          {/* Placement results */}
          {placed && (
            <>
              <div className="border-t border-border" />
              <div className="space-y-1 text-[10px] font-mono">
                {placedCount > 0 && (
                  <div className="flex items-center justify-between text-bet-won">
                    <span>Placed</span><span className="tabular-nums">{placedCount}</span>
                  </div>
                )}
                {failedCount > 0 && (
                  <div className="flex items-center justify-between text-bet-lost">
                    <span>Failed</span><span className="tabular-nums">{failedCount}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error */}
          {!placed && lastError && (
            <div className="text-[10px] font-mono text-bet-lost bg-bet-lost/10 border border-bet-lost/30 rounded px-2 py-1.5">
              {lastError}
            </div>
          )}
        </div>

        {/* Action button — pinned to bottom */}
        <div className="p-3 border-t border-border shrink-0">
          {!placed ? (
            <Button
              variant="primary"
              fullWidth
              onClick={placeBets}
              loading={isPlacing}
              disabled={isPlacing || selections.length === 0}
            >
              {isPlacing ? "Placing..." : `Place ${selections.length} Bet${selections.length !== 1 ? "s" : ""}`}
            </Button>
          ) : (
            <Button variant="outline" fullWidth onClick={clearSelections}>
              Clear Slip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
