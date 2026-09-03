import type { ArchitectSlip, PoolFixture } from "@/lib/betarchitect/types";
import { cn } from "@/lib/utils/cn";
import { getFixtureColor, getFixtureTextColor, getFixtureDot } from "@/lib/utils/colorMap";
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

/**
 * Displays a single fixture leg with all available outcomes.
 * The selected outcome is highlighted; others are shown dimmed.
 */
function FixtureLegRow({ leg }: { leg: PoolFixture }) {
  const colorClass = getFixtureColor(leg.fixtureId);
  const textColorClass = getFixtureTextColor(leg.fixtureId);
  const dotClass = getFixtureDot(leg.fixtureId);
  const hasAllOutcomes = leg.allOutcomes && leg.allOutcomes.length > 1;

  return (
    <div
      className={cn(
        "border-l-2 pl-2 py-1.5 rounded-r-sm",
        colorClass,
      )}
    >
      {/* Fixture name + league */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotClass)} />
        <span className="text-[10px] font-mono font-medium text-foreground truncate">
          {leg.fixtureName}
        </span>
      </div>

      {/* Market label */}
      <div className="text-[9px] font-mono text-muted-foreground/70 ml-3 mb-1 truncate">
        {leg.market || leg.marketName}
      </div>

      {/* All outcomes as pills */}
      {hasAllOutcomes ? (
        <div className="flex flex-wrap gap-1 ml-3">
          {leg.allOutcomes!.map((outcome) => {
            const isSelected = outcome.name === leg.outcomeName && outcome.odds === leg.odds;
            return (
              <span
                key={`${outcome.name}-${outcome.odds}`}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono tabular-nums border",
                  isSelected
                    ? "border-primary/50 bg-primary/15 text-primary font-semibold"
                    : "border-border/50 bg-secondary/30 text-muted-foreground/60",
                )}
              >
                <span className="truncate max-w-[80px]">{outcome.name}</span>
                <span>{outcome.odds.toFixed(2)}</span>
              </span>
            );
          })}
        </div>
      ) : (
        /* Fallback: just show the selected outcome */
        <div className="flex items-center justify-between ml-3">
          <span className={cn("text-[10px] font-mono font-medium", textColorClass)}>
            {leg.outcomeName || leg.selection}
          </span>
          <span className="text-[10px] font-mono font-semibold text-foreground tabular-nums">
            {leg.odds.toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function SlipCard({ slip, onAddToSlip }: SlipCardProps) {
  return (
    <div
      className={cn(
        "border border-border rounded p-3",
        "hover:border-border/80 transition-colors",
      )}
    >
      {/* Header: strategy name + risk badge + risk meter */}
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

      {/* Stats row */}
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

      {/* Legs with color coding and all odds */}
      <div className="space-y-1.5 mb-3">
        {slip.legs.map((leg) => (
          <FixtureLegRow key={leg.id} leg={leg} />
        ))}
      </div>

      {/* Add to slip button */}
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
