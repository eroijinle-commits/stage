import { SlipItemProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { X, CheckCircle, XCircle } from "lucide-react";
import { NumberInput } from "@/components/ui";

export default function SlipItem({
  selection,
  onRemove,
  stake,
  onStakeChange,
  mode,
  result,
}: SlipItemProps) {
  return (
    <div
      className={cn(
        "border border-border rounded p-2.5 text-xs font-mono space-y-2",
        result?.success && "border-bet-won/40 bg-bet-won/5",
        result && !result.success && "border-bet-lost/40 bg-bet-lost/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground truncate text-[10px]">{selection.fixtureName}</p>
          <p className="text-foreground font-medium truncate">{selection.outcomeName}</p>
          <p className="text-muted-foreground truncate text-[10px]">{selection.marketName}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-primary font-bold tabular-nums">{selection.odds.toFixed(2)}</span>
          {!result && (
            <button
              onClick={onRemove}
              className="text-muted-foreground hover:text-bet-lost transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
      {mode === "singles" && onStakeChange && !result && (
        <NumberInput
          value={stake ?? 0}
          onChange={onStakeChange}
          currency="NGN"
          format="currency"
          step={500}
          min={100}
          showControls
        />
      )}
      {result && (
        <div
          className={cn(
            "flex items-center gap-1",
            result.success ? "text-bet-won" : "text-bet-lost",
          )}
        >
          {result.success ? <CheckCircle size={11} /> : <XCircle size={11} />}
          <span>{result.success ? `Placed · ID: ${result.betId?.slice(0, 8)}` : result.error}</span>
        </div>
      )}
    </div>
  );
}
