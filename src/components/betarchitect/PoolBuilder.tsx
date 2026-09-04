import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PoolFixture } from "@/lib/betarchitect/types";
import OddsGapBadge from "@/components/scanner/OddsGapBadge";

interface PoolBuilderProps {
  pool: PoolFixture[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function PoolBuilder({ pool, onRemove, onClear }: PoolBuilderProps) {
  return (
    <div className="border border-border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Pool
          <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/70">
            ({pool.length})
          </span>
        </h3>
        {pool.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {pool.length === 0 ? (
        <p className="text-[10px] font-mono text-muted-foreground/60 italic py-2">
          No fixtures in pool. Add from Discovery or Value Scanner.
        </p>
      ) : (
        <div className="space-y-1">
          {pool.map((fixture) => (
            <div
              key={fixture.id}
              className={cn(
                "flex items-center justify-between gap-2 py-1.5 px-2 rounded",
                "bg-secondary/50 border border-border/50",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-mono text-foreground truncate">
                  {fixture.fixtureName}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground truncate">
                  {fixture.market} · {fixture.selection}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {fixture.source === "value-scanner" && fixture.gapRatio != null && (
                  <OddsGapBadge ratio={fixture.gapRatio} />
                )}
                <span className="text-[11px] font-mono font-medium text-foreground tabular-nums">
                  {fixture.odds.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(fixture.id)}
                  className="text-muted-foreground hover:text-bet-lost transition-colors p-0.5"
                  title="Remove from pool"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
