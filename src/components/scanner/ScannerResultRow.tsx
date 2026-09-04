/**
 * ScannerResultRow — displays a fixture with its flagged markets showing odds gaps.
 * @module components/scanner/ScannerResultRow
 */

import { useState, useCallback } from "react";
import type { StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import OddsGapBadge from "./OddsGapBadge";
import { ExternalLink, AlertTriangle, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FlaggedMarket } from "@/lib/scanner/types";

export type { FlaggedMarket };

interface ScannerResultRowProps {
  fixture: DiscoveryFixture;
  flaggedMarkets: FlaggedMarket[];
  failed?: boolean;
  errorMessage?: string;
  onAddSelection: (selection: BetSelection) => void;
  onAddToPool: (flagged: FlaggedMarket, outcome: StakeMarketOutcome) => void;
}

export default function ScannerResultRow({
  fixture,
  flaggedMarkets,
  failed,
  errorMessage,
  onAddSelection,
  onAddToPool,
}: ScannerResultRowProps) {
  const [expanded, setExpanded] = useState(false);

  const startTime = fixture.startTime
    ? new Date(fixture.startTime).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBD";

  const handleAddOutcome = useCallback(
    (market: StakeMarket, outcome: StakeMarketOutcome) => {
      onAddSelection({
        id: `scanner-${fixture.id}-${market.id}-${outcome.id}`,
        fixtureSlug: fixture.slug,
        fixtureName: fixture.name,
        fixtureId: fixture.id,
        tournamentName: fixture.tournament.name,
        marketId: market.id,
        marketName: market.name,
        outcomeId: outcome.id,
        outcomeName: outcome.name,
        odds: outcome.odds,
        active: outcome.active,
        startTime: fixture.startTime,
        addedAt: Date.now(),
        betType: "value-scanner",
        betTypeLine: null,
        sport: fixture.sport,
        stakeUrl: fixture.stakeUrl,
      });
    },
    [fixture, onAddSelection],
  );

  // Failed fixture — show inline warning
  if (failed) {
    return (
      <div className="px-4 py-3 border-b border-border/50 bg-red-500/5">
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-400 shrink-0" />
          <span className="text-xs font-mono text-foreground truncate">{fixture.name}</span>
          <span className="text-[10px] font-mono text-red-400 shrink-0">
            {errorMessage ?? "Failed to load"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors">
      {/* Fixture Header */}
      <div className="flex items-center gap-3">
        {/* Checkbox / expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Fixture info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium text-foreground truncate">
              {fixture.name}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              {startTime}
            </span>
          </div>
          <div className="text-[10px] font-mono text-muted-foreground truncate">
            {fixture.tournament.category.name} · {fixture.tournament.name}
          </div>
        </div>

        {/* Flagged market count */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono text-muted-foreground">
            {flaggedMarkets.length} flagged market{flaggedMarkets.length !== 1 ? "s" : ""}
          </span>
          {/* Best ratio badge */}
          {flaggedMarkets.length > 0 && (
            <OddsGapBadge ratio={Math.max(...flaggedMarkets.map((m) => m.gapRatio))} />
          )}
        </div>

        {/* Stake link */}
        {fixture.stakeUrl && (
          <a
            href={fixture.stakeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Expanded: Flagged markets detail */}
      {expanded && (
        <div className="mt-2 space-y-2 pl-5">
          {flaggedMarkets.map((fm) => (
            <div key={fm.market.id} className="bg-secondary/50 rounded border border-border/50 p-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono font-medium text-foreground">
                  {fm.market.name}
                </span>
                <OddsGapBadge ratio={fm.gapRatio} />
                <span className="text-[10px] font-mono text-muted-foreground">
                  {fm.market.outcomes.filter((o) => o.active).length} outcomes
                </span>
              </div>

              {/* Outcomes */}
              <div className="flex flex-wrap gap-1">
                {fm.market.outcomes
                  .filter((o) => o.active)
                  .sort((a, b) => a.odds - b.odds)
                  .map((outcome) => {
                    const isExtreme =
                      outcome.id === fm.minOutcome.id || outcome.id === fm.maxOutcome.id;
                    return (
                      <span key={outcome.id} className="inline-flex items-center gap-0.5">
                        <button
                          onClick={() => handleAddOutcome(fm.market, outcome)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono transition-colors",
                            isExtreme
                              ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20"
                              : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
                          )}
                        >
                          <span>{outcome.name}</span>
                          <span className="font-bold">{outcome.odds}</span>
                        </button>
                        <button
                          onClick={() => onAddToPool(fm, outcome)}
                          title="Add to BetArchitect pool"
                          className="p-1 rounded border border-transparent text-muted-foreground/60 hover:text-primary hover:border-primary/30 transition-colors"
                        >
                          <Layers size={10} />
                        </button>
                      </span>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
