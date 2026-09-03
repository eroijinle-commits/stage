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
 * Displays a single fixture leg with clear visual hierarchy:
 * - Fixture name prominently displayed
 * - Market name as context
 * - All available odds shown in a row, with the selected one clearly highlighted
 * - Selected outcome gets a checkmark and primary color treatment
 */
function FixtureLegRow({ leg }: { leg: PoolFixture }) {
  const colorClass = getFixtureColor(leg.fixtureId);
  const dotClass = getFixtureDot(leg.fixtureId);
  const allOutcomes = leg.allOutcomes ?? [];
  const hasMultipleOutcomes = allOutcomes.length > 1;

  return (
    <div
      className={cn(
        "border-l-[3px] pl-3 py-2 rounded-r",
        colorClass,
      )}
    >
      {/* Row 1: Fixture name */}
      <div className="flex items-center gap-2 mb-0.5">
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
        <span className="text-[11px] font-mono font-bold text-foreground leading-tight">
          {leg.fixtureName}
        </span>
      </div>

      {/* Row 2: Market name */}
      <div className="text-[10px] font-mono text-muted-foreground ml-4 mb-1.5">
        {leg.market || leg.marketName}
      </div>

      {/* Row 3: All odds displayed clearly */}
      {hasMultipleOutcomes ? (
        <div className="ml-4 grid gap-1" style={{ gridTemplateColumns: `repeat(${allOutcomes.length}, minmax(0, 1fr))` }}>
          {allOutcomes.map((outcome) => {
            const isSelected = outcome.name === leg.outcomeName && outcome.odds === leg.odds;
            return (
              <div
                key={`${outcome.name}-${outcome.odds}`}
                className={cn(
                  "flex flex-col items-center px-2 py-1.5 rounded border text-center",
                  isSelected
                    ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                    : "border-border/40 bg-secondary/20",
                )}
              >
                <span
                  className={cn(
                    "text-[10px] font-mono leading-tight truncate w-full",
                    isSelected ? "text-primary font-bold" : "text-muted-foreground/60",
                  )}
                >
                  {outcome.name}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold tabular-nums leading-tight",
                    isSelected ? "text-primary" : "text-muted-foreground/50",
                  )}
                >
                  {outcome.odds.toFixed(2)}
                </span>
                {isSelected && (
                  <span className="text-[8px] font-mono text-primary mt-0.5">✓ PICK</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Single outcome or fallback — show selected clearly */
        <div className="ml-4 flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-primary bg-primary/10 ring-1 ring-primary/30">
            <span className="text-[11px] font-mono font-bold text-primary">
              {leg.outcomeName || leg.selection}
            </span>
            <span className="text-xs font-mono font-bold text-primary tabular-nums">
              {leg.odds.toFixed(2)}
            </span>
            <span className="text-[8px] font-mono text-primary">✓ PICK</span>
          </div>
        </div>
      )}

      {/* Row 4: League / sport context */}
      <div className="text-[9px] font-mono text-muted-foreground/40 ml-4 mt-1">
        {leg.league || leg.tournamentName}
        {leg.sport ? ` · ${leg.sport}` : ""}
      </div>
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
