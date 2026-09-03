import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import type { RuleSettings } from "@/lib/betarchitect/types";

interface RulesEngineProps {
  expertMode: boolean;
  onToggleExpertMode: (v: boolean) => void;
  onOverride: (overrides: Partial<RuleSettings>) => void;
}

function RuleInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-[10px] font-mono text-muted-foreground shrink-0">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className={cn(
          "w-20 bg-secondary border border-border rounded px-2 py-1 text-[11px] font-mono text-foreground text-right tabular-nums",
          "focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring",
        )}
      />
    </div>
  );
}

export default function RulesEngine({
  expertMode,
  onToggleExpertMode,
  onOverride,
}: RulesEngineProps) {
  const [local, setLocal] = useState<Partial<RuleSettings>>({});

  const update = (key: keyof RuleSettings, value: number) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onOverride(next);
  };

  return (
    <div className="border border-border rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
          Rules
        </h3>
        <button
          type="button"
          onClick={() => onToggleExpertMode(!expertMode)}
          className={cn(
            "relative inline-flex h-4 w-7 items-center rounded-full transition-colors",
            expertMode ? "bg-primary" : "bg-muted border border-border",
          )}
          title={expertMode ? "Switch to standard mode" : "Switch to expert mode"}
        >
          <span
            className={cn(
              "inline-block h-3 w-3 rounded-full bg-white transition-transform",
              expertMode ? "translate-x-3.5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>

      {!expertMode ? (
        <p className="text-[10px] font-mono text-muted-foreground/60 italic">
          Standard rules applied
        </p>
      ) : (
        <div className="space-y-2 mt-2">
          <RuleInput
            label="Min Leg Odds"
            value={local.minLegOdds ?? 1.1}
            onChange={(v) => update("minLegOdds", v)}
            min={1.0}
            step={0.1}
          />
          <RuleInput
            label="Max Combined Odds"
            value={local.maxCombinedOdds ?? 15}
            onChange={(v) => update("maxCombinedOdds", v)}
            min={1}
            step={1}
          />
          <RuleInput
            label="Max Same Sport"
            value={local.maxSameSport ?? 3}
            onChange={(v) => update("maxSameSport", v)}
            min={1}
            step={1}
          />
          <RuleInput
            label="Max Same League"
            value={local.maxSameLeague ?? 2}
            onChange={(v) => update("maxSameLeague", v)}
            min={1}
            step={1}
          />
        </div>
      )}
    </div>
  );
}
