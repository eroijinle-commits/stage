import { useBetSlip } from "@/hooks/useBetSlip";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { X, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import { useState, useMemo, useCallback } from "react";
import type { BetSelection } from "@/lib/contracts/ui.contract";

type SortKey = "odds" | "time" | null;
type SortDir = "asc" | "desc";

interface ManualTabProps {
  bulkStake?: string;
  onBulkStakeChange?: (value: string) => void;
}

function getStatus(result: { success: boolean } | undefined): "pending" | "placed" | "failed" {
  if (!result) return "pending";
  return result.success ? "placed" : "failed";
}

const STATUS_CONFIG = {
  pending: { variant: "warning" as const, label: "Pending" },
  placed: { variant: "success" as const, label: "Placed" },
  failed: { variant: "error" as const, label: "Failed" },
};

function formatCurrency(value: number, currency: string) {
  return `${currency} ${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getOddsClass(odds: number): string {
  if (odds >= 2) return "text-bet-won";
  if (odds < 1.5) return "text-bet-lost";
  return "text-odds-stable";
}

export default function ManualTab({ bulkStake, onBulkStakeChange }: ManualTabProps = {}) {
  const { selections, mode, stakePerLeg, placeResults, removeSelection } = useBetSlip();
  const currency = useSettingsStore((s) => s.currency);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

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

  if (selections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-xs font-mono text-muted-foreground gap-2">
        <AlertCircle size={18} className="text-muted-foreground/50" />
        <span>No selections. Add bets from Discovery.</span>
      </div>
    );
  }

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown size={9} className="opacity-40" />;
    return sortDir === "asc" ? <ArrowUp size={9} /> : <ArrowDown size={9} />;
  };

  const isSingles = mode === "singles";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-[11px] font-mono">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left px-3 py-1.5 font-medium w-8">#</th>
              <th className="text-left px-2 py-1.5 font-medium min-w-[180px]">Fixture</th>
              <th className="text-left px-2 py-1.5 font-medium min-w-[160px]">
                Market / Selection
              </th>
              <th className="text-left px-2 py-1.5 font-medium">
                <button
                  onClick={() => toggleSort("odds")}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  Odds
                  {renderSortIcon("odds")}
                </button>
              </th>
              <th className="text-right px-2 py-1.5 font-medium min-w-[90px]">Stake</th>
              <th className="text-right px-2 py-1.5 font-medium min-w-[90px]">Return</th>
              <th className="text-center px-2 py-1.5 font-medium w-16">Status</th>
              <th className="w-8 px-1 py-1.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sorted.map((s: BetSelection, index: number) => {
              const result = placeResults.find(
                (r: { selectionId: string }) => r.selectionId === s.id,
              );
              const status = getStatus(result);
              const stake = stakePerLeg;
              const rowReturn = stake * s.odds;

              return (
                <tr
                  key={s.id}
                  className={cn(
                    "transition-colors",
                    status === "placed" && "bg-bet-won/5",
                    status === "failed" && "bg-bet-lost/5",
                    "hover:bg-muted/20",
                  )}
                >
                  <td className="px-3 py-1.5 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="px-2 py-1.5 min-w-[180px]">
                    <p className="text-foreground truncate max-w-[220px]">{s.fixtureName}</p>
                    <p className="text-muted-foreground truncate max-w-[220px]">
                      {s.tournamentName}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 tabular-nums">
                      {new Date(s.startTime).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </td>
                  <td className="px-2 py-1.5 min-w-[160px]">
                    <p className="text-foreground truncate max-w-[200px]">{s.outcomeName}</p>
                    <p className="text-muted-foreground truncate max-w-[200px]">{s.marketName}</p>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className={cn("font-semibold tabular-nums", getOddsClass(s.odds))}>
                      {s.odds.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-foreground tabular-nums">
                      {stake.toLocaleString("en-NG")}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span className="text-foreground tabular-nums">
                      {formatCurrency(rowReturn, currency)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <Badge variant={STATUS_CONFIG[status].variant} size="sm">
                      {STATUS_CONFIG[status].label}
                    </Badge>
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {!result && (
                      <button
                        onClick={() => removeSelection(s.id)}
                        className="text-muted-foreground hover:text-bet-lost transition-colors"
                        title="Remove"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk stake row for singles */}
      {isSingles && selections.length > 0 && bulkStake !== undefined && onBulkStakeChange && (
        <div className="shrink-0 border-t border-border px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono">
          <span className="text-muted-foreground">Set all stakes:</span>
          <input
            type="number"
            value={bulkStake}
            onChange={(e) => onBulkStakeChange(e.target.value)}
            placeholder={String(stakePerLeg)}
            className="w-20 bg-secondary border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-right focus:outline-none focus:border-ring"
          />
        </div>
      )}
    </div>
  );
}
