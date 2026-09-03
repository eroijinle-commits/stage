import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui";

interface BottomBarProps {
  selectionCount: number;
  currency: string;
  totalStake: number;
  displayReturn: number;
  potentialProfit: number;
  isPlacing?: boolean;
  placed?: boolean;
  onPlaceBets: () => void;
  onClear: () => void;
}

export default function BottomBar({
  selectionCount,
  currency,
  totalStake,
  displayReturn,
  potentialProfit,
  isPlacing,
  placed,
  onPlaceBets,
  onClear,
}: BottomBarProps) {
  return (
    <div className="h-12 shrink-0 border-t border-border bg-card px-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Bets
          </span>
          <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
            {selectionCount}
          </span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Total Stake
          </span>
          <span className="text-xs font-mono font-semibold text-foreground tabular-nums">
            {currency} {totalStake.toLocaleString("en-NG")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex flex-col leading-none text-right">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Return
          </span>
          <span className="text-xs font-mono font-semibold text-primary tabular-nums">
            {currency}{" "}
            {displayReturn.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="flex flex-col leading-none text-right">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">
            Profit
          </span>
          <span
            className={cn(
              "text-xs font-mono font-semibold tabular-nums",
              potentialProfit >= 0 ? "text-bet-won" : "text-bet-lost",
            )}
          >
            {currency}{" "}
            {potentialProfit.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {!placed ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onPlaceBets}
            loading={isPlacing}
            disabled={isPlacing || selectionCount === 0}
            className="min-w-[100px]"
          >
            {isPlacing ? "Placing..." : "Place Bets"}
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onClear} className="min-w-[100px]">
            Clear Slip
          </Button>
        )}
      </div>
    </div>
  );
}
