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
 * Displays a single fixture leg in a clean table-like layout:
 * ┌─────────────────────────────────────────────┐
 * │ ● Hannover 96 vs Karlsruher                 │  ← fixture (row 1)
 * │   Both Teams to Score                       │  ← market  (row 2)
 * │   Yes              No                       │  ← outcome names  (row 3)
 * │   1.46 ★           2.55                     │  ← odds, selected highlighted (row 4)
 * │   CAF Confederations Cup · soccer           │  ← league context (row 5)
 * └─────────────────────────────────────────────┘
 */
function FixtureLegRow({ leg }: { leg: PoolFixture }) {
  const colorClass = getFixtureColor(leg.fixtureId);
  const dotClass = getFixtureDot(leg.fixtureId);
  const allOutcomes = leg.allOutcomes ?? [];
  const hasMultipleOutcomes = allOutcomes.length > 1;
  const outcomeCount = Math.max(allOutcomes.length, 1);

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
      <div className="text-[10px] font-mono text-muted-foreground ml-4 mb-1">
        {leg.market || leg.marketName}
      </div>

      {/* Rows 3–4: Outcome names + odds in a table grid */}
      {hasMultipleOutcomes ? (
        <div className="ml-4">
          {/* Row 3: Outcome names */}
          <div
            className="grid gap-x-4 gap-y-0"
            style={{ gridTemplateColumns: `repeat(${outcomeCount}, minmax(0, 1fr))` }}
          >
            {allOutcomes.map((outcome) => {
              const isSelected = outcome.name === leg.outcomeName && outcome.odds === leg.odds;
              return (
                <div
                  key={`name-${outcome.name}`}
                  className="text-[10px] font-mono text-muted-foreground/60 leading-tight truncate"
                >
                  {outcome.name}
                </div>
              );
            })}
          </div>

          {/* Row 4: Odds — selected one gets bold + primary highlight */}
          <div
            className="grid gap-x-4 gap-y-0"
            style={{ gridTemplateColumns: `repeat(${outcomeCount}, minmax(0, 1fr))` }}
          >
            {allOutcomes.map((outcome) => {
              const isSelected = outcome.name === leg.outcomeName && outcome.odds === leg.odds;
              return (
                <div
                  key={`odds-${outcome.name}`}
                  className={cn(
                    "text-xs font-mono font-bold tabular-nums leading-tight",
                    isSelected
                      ? "text-primary underline decoration-primary/40 underline-offset-2"
                      : "text-muted-foreground/50",
                  )}
                >
                  {outcome.odds.toFixed(2)}
                  {isSelected && (
                    <span className="text-[8px] font-mono text-primary ml-1 no-underline">★</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Single outcome or fallback — show selected clearly */
        <div className="ml-4 flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {leg.outcomeName || leg.selection}
          </span>
          <span className="text-xs font-mono font-bold text-primary tabular-nums underline decoration-primary/40 underline-offset-2">
            {leg.odds.toFixed(2)}
          </span>
          <span className="text-[8px] font-mono text-primary">★</span>
        </div>
      )}

      {/* Row 5: League / sport context */}
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
