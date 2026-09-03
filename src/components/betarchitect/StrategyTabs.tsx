import { useState, useMemo } from "react";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { ArchitectSlip } from "@/lib/betarchitect/types";
import SlipCard from "./SlipCard";

interface StrategyTabsProps {
  slips: ArchitectSlip[];
  isGenerating: boolean;
  onGenerate: () => void;
  onAddToSlip: (slip: ArchitectSlip) => void;
  poolSize: number;
}

const TABS = ["All", "Fortress", "Growth", "Upside", "System"] as const;

const tabKey: Record<(typeof TABS)[number], string | null> = {
  All: null,
  Fortress: "fortress",
  Growth: "growth",
  Upside: "upside",
  System: "system",
};

export default function StrategyTabs({
  slips,
  isGenerating,
  onGenerate,
  onAddToSlip,
  poolSize,
}: StrategyTabsProps) {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All");

  const filtered = useMemo(() => {
    const key = tabKey[activeTab];
    if (!key) return slips;
    return slips.filter((s) => s.strategy === key);
  }, [slips, activeTab]);

  return (
    <div>
      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={poolSize === 0 || isGenerating}
        className={cn(
          "w-full py-2 px-4 rounded text-xs font-mono font-semibold transition-colors",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          poolSize > 0 && !isGenerating
            ? "bg-primary text-primary-foreground hover:bg-brand-400 active:bg-brand-600"
            : "bg-secondary text-secondary-foreground border border-border",
        )}
      >
        {isGenerating ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 size={12} className="animate-spin" />
            Generating…
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Play size={12} />
            Generate
          </span>
        )}
      </button>

      {/* Tab bar */}
      <div className="flex gap-0 mt-3 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 py-1.5 text-[10px] font-mono font-medium transition-colors -mb-px",
              activeTab === tab
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Slips list */}
      <div className="mt-3 space-y-2">
        {filtered.length === 0 && !isGenerating && (
          <p className="text-[10px] font-mono text-muted-foreground/60 italic py-4 text-center">
            {poolSize === 0
              ? "Select fixtures and generate"
              : "No slips generated for this strategy"}
          </p>
        )}
        {filtered.map((slip) => (
          <SlipCard key={slip.id} slip={slip} onAddToSlip={onAddToSlip} />
        ))}
      </div>
    </div>
  );
}
