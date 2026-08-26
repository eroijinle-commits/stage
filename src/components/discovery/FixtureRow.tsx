/**
 * FixtureRow — table row for a fixture with live score display,
 * odds trend indicators, and market preview.
 * @module components/discovery/FixtureRow
 */

import { useMemo } from "react";
import { FixtureRowProps, BetSelection, BetTypeInfo } from "@/lib/contracts/ui.contract";
import { OddsButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { Radio, ChevronRight, Clock } from "lucide-react";
import { useSlipStore } from "@/store/useSlipStore";

function makeSelection(
  fixtureId: string, slug: string, name: string, tournament: string,
  startTime: string, betTypeName: string, line: string | null,
  outcome: { id: string; name: string; odds: number; active: boolean },
): BetSelection {
  return {
    id: outcome.id, fixtureSlug: slug, fixtureName: name, fixtureId,
    tournamentName: tournament, marketId: `${fixtureId}-${betTypeName}`,
    marketName: betTypeName + (line ? ` ${line}` : ""), outcomeId: outcome.id,
    outcomeName: outcome.name, odds: outcome.odds, active: outcome.active,
    startTime, addedAt: Date.now(), betType: betTypeName, betTypeLine: line,
  };
}

function BetTypeColumn({ fixture, info, slipIds, onAdd }: {
  fixture: FixtureRowProps["fixture"]; info: BetTypeInfo;
  slipIds: Set<string>; onAdd: (s: BetSelection) => void;
}) {
  if (!info.available) {
    return <span className="text-[10px] font-mono text-muted-foreground/60 italic">Not Available</span>;
  }

  if (info.overOutcome && info.underOutcome) {
    return (
      <div className="flex items-center gap-1.5">
        <OddsButton odds={info.overOutcome.odds} name={`O ${info.line}`} active={info.overOutcome.active}
          selected={slipIds.has(info.overOutcome.id)}
          onClick={() => onAdd(makeSelection(fixture.id, fixture.slug, fixture.name, fixture.tournament.name, fixture.startTime, info.betTypeName, info.line, info.overOutcome!))} />
        <OddsButton odds={info.underOutcome.odds} name={`U ${info.line}`} active={info.underOutcome.active}
          selected={slipIds.has(info.underOutcome.id)}
          onClick={() => onAdd(makeSelection(fixture.id, fixture.slug, fixture.name, fixture.tournament.name, fixture.startTime, info.betTypeName, info.line, info.underOutcome!))} />
      </div>
    );
  }

  if (info.allOutcomes) {
    return (
      <div className="flex items-center gap-1">
        {info.allOutcomes.map((o) => (
          <OddsButton key={o.id} odds={o.odds} name={o.name} active={o.active}
            selected={slipIds.has(o.id)}
            onClick={() => onAdd(makeSelection(fixture.id, fixture.slug, fixture.name, fixture.tournament.name, fixture.startTime, info.betTypeName, null, o))} />
        ))}
      </div>
    );
  }

  if (info.singleOutcome) {
    return (
      <OddsButton odds={info.singleOutcome.odds} name={info.singleOutcome.name}
        active={info.singleOutcome.active} selected={slipIds.has(info.singleOutcome.id)}
        onClick={() => onAdd(makeSelection(fixture.id, fixture.slug, fixture.name, fixture.tournament.name, fixture.startTime, info.betTypeName, null, info.singleOutcome!))} />
    );
  }

  return null;
}

function FallbackOdds({ fixture, slipIds, onAdd }: {
  fixture: FixtureRowProps["fixture"]; slipIds: Set<string>; onAdd: (s: BetSelection) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {fixture.previewMarkets?.flatMap((market) =>
        market.outcomes.map((outcome) => {
          const selId = `${fixture.id}-${market.name}-${outcome.name}`;
          return (
            <OddsButton key={selId} odds={outcome.odds} name={outcome.name}
              active={outcome.active} selected={slipIds.has(selId)}
              onClick={() => onAdd({
                id: selId, fixtureSlug: fixture.slug, fixtureName: fixture.name, fixtureId: fixture.id,
                tournamentName: fixture.tournament.name, marketId: `${fixture.id}-${market.name}`,
                marketName: market.name, outcomeId: selId, outcomeName: outcome.name,
                odds: outcome.odds, active: outcome.active, startTime: fixture.startTime,
                addedAt: Date.now(), betType: market.name, betTypeLine: null,
              })}
            />
          );
        })
      )}
    </div>
  );
}

/**
 * LiveScoreDisplay — shows score and clock for live fixtures.
 */
function LiveScoreDisplay({ fixture }: { fixture: FixtureRowProps["fixture"] }) {
  if (!fixture.isLive) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Radio size={10} className="text-bet-lost animate-pulse" />
        <span className="text-[10px] font-mono text-bet-lost font-medium">LIVE</span>
      </div>
      {fixture.homeScore !== undefined && (
        <div className="flex items-center gap-1">
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">
            {fixture.homeScore}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">–</span>
          <span className="text-sm font-mono font-bold text-foreground tabular-nums">
            {fixture.awayScore}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Format fixture time for display.
 */
function formatFixtureTime(startTime: string): { date: string; time: string; isToday: boolean; isTomorrow: boolean } {
  const d = new Date(startTime);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fixtureDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const isToday = fixtureDate.getTime() === today.getTime();
  const isTomorrow = fixtureDate.getTime() === tomorrow.getTime();

  let date: string;
  if (isToday) {
    date = "Today";
  } else if (isTomorrow) {
    date = "Tomorrow";
  } else {
    date = d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  }

  return { date, time, isToday, isTomorrow };
}

export default function FixtureRow({ fixture, selected, onSelect, onViewMarkets, onAddSelection }: FixtureRowProps) {
  const selectionIds = useSlipStore((s) => s.selections.map((x) => x.id).join(","));
  const slipIds = useMemo(() => new Set(selectionIds ? selectionIds.split(",") : []), [selectionIds]);

  const { date, time, isToday, isTomorrow } = formatFixtureTime(fixture.startTime);

  return (
    <tr className={cn(
      "border-b border-border/50 hover:bg-muted/20 transition-colors group",
      selected && "bg-primary/5",
      fixture.isLive && "bg-bet-lost/[0.03]",
    )}>
      <td className="px-3 py-2.5 w-8">
        <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} className="accent-primary w-3.5 h-3.5 cursor-pointer" />
      </td>
      <td className="px-3 py-2.5 w-24">
        {fixture.isLive ? (
          <LiveScoreDisplay fixture={fixture} />
        ) : (
          <div className="text-[10px] font-mono text-muted-foreground tabular-nums">
            <div className={cn(isToday && "text-primary font-medium", isTomorrow && "text-foreground")}>
              {date}
            </div>
            <div className="flex items-center gap-1">
              <Clock size={8} className="shrink-0" />
              {time}
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 min-w-[200px]">
        <div className="text-xs font-mono text-foreground">
          {fixture.competitors[0]?.name} <span className="text-muted-foreground">vs</span> {fixture.competitors[1]?.name}
        </div>
        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
          {fixture.tournament.category.name} · {fixture.tournament.name}
        </div>
      </td>
      <td className="px-3 py-2.5">
        {fixture.betTypeInfo
          ? <BetTypeColumn fixture={fixture} info={fixture.betTypeInfo} slipIds={slipIds} onAdd={onAddSelection} />
          : <FallbackOdds fixture={fixture} slipIds={slipIds} onAdd={onAddSelection} />
        }
      </td>
      <td className="px-3 py-2.5 w-8">
        <button onClick={onViewMarkets} className="text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100" title="View all markets">
          <ChevronRight size={14} />
        </button>
      </td>
    </tr>
  );
}
