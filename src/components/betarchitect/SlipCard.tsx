import type { ArchitectSlip } from "@/lib/betarchitect/types";
import { cn } from "@/lib/utils/cn";
import RiskMeter from "./RiskMeter";

interface SlipCardProps {
  slip: ArchitectSlip;
  onAddToSlip: (slip: ArchitectSlip) => void;
}

const riskBadgeVariant: Record<string, "success" | "warning" | "error"> = {
  low: "success",
  medium: "warning",
  high: "error",
  extreme: "error",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SlipCard({ slip, onAddToSlip }: SlipCardProps) {
  return (
    <div
      className={cn("border border-border rounded p-3", "hover:border-border/80 transition-colors")}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-semibold text-foreground">
            {capitalize(slip.strategy)}
          </span>
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-sm uppercase tracking-wide",
              riskBadgeVariant[slip.riskLevel] === "success" && "bg-bet-won/15 text-bet-won",
              riskBadgeVariant[slip.riskLevel] === "warning" &&
                "bg-bet-pending/15 text-bet-pending",
              riskBadgeVariant[slip.riskLevel] === "error" && "bg-bet-lost/15 text-bet-lost",
            )}
          >
            {slip.riskLevel}
          </span>
        </div>
        <RiskMeter level={slip.riskLevel} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div>
          <div className="text-[10px] font-mono text-muted-foreground">Combined Odds</div>
          <div className="text-sm font-mono font-bold text-foreground tabular-nums">
            {slip.combinedOdds.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-muted-foreground">Est. Win Rate</div>
          <div className="text-sm font-mono font-bold text-foreground tabular-nums">
            {(slip.estimatedWinRate * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono text-muted-foreground">Legs</div>
          <div className="text-sm font-mono font-bold text-foreground tabular-nums">
            {slip.legs.length}
          </div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        {slip.legs.map((leg) => (
          <div key={leg.id} className="text-[10px] font-mono text-muted-foreground truncate">
            {leg.fixtureName} · {leg.selection}
            <span className="text-foreground ml-1 tabular-nums">{leg.odds.toFixed(2)}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onAddToSlip(slip)}
        className={cn(
          "w-full py-1.5 rounded text-xs font-mono font-medium",
          "bg-secondary text-secondary-foreground border border-border",
          "hover:bg-muted transition-colors",
        )}
      >
        Add to Slip
      </button>
    </div>
  );
}
