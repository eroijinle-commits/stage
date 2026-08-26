import { getBetTypeById, getLinesForBetType } from "@/lib/utils/bet-type-mapper";
import { cn } from "@/lib/utils/cn";

interface BetTypeLineSelectorProps {
  betTypeId: string;
  value: string | null;
  onChange: (line: string | null) => void;
  availableLines?: string[];
  lineOdds?: Record<string, { over?: number; under?: number }>;
}

export default function BetTypeLineSelector({ betTypeId, value, onChange, availableLines, lineOdds }: BetTypeLineSelectorProps) {
  const betType = getBetTypeById(betTypeId);
  if (!betType?.hasLines) return null;

  const allLines = getLinesForBetType(betTypeId);
  const lines = availableLines ?? allLines;
  const preview = value && lineOdds?.[value];

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Line</label>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1 flex-wrap">
          {lines.map((line) => {
            const unavailable = availableLines && !availableLines.includes(line);
            return (
              <button
                key={line}
                type="button"
                disabled={unavailable}
                onClick={() => onChange(line === value ? null : line)}
                className={cn(
                  "px-2.5 py-1 rounded border text-xs font-mono tabular-nums transition-colors",
                  value === line
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  unavailable && "opacity-30 cursor-not-allowed",
                )}
              >
                {line}
              </button>
            );
          })}
        </div>
        {preview && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
            <span>Over {value} <span className="text-odds-up">~@{preview.over?.toFixed(2) ?? "—"}</span></span>
            <span className="text-border">|</span>
            <span>Under {value} <span className="text-odds-down">~@{preview.under?.toFixed(2) ?? "—"}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
