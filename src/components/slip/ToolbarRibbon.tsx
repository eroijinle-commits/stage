import { cn } from "@/lib/utils/cn";
import { Share2, Save, Trash2, Check } from "lucide-react";

interface ToolbarRibbonProps {
  mode: "singles" | "parlay";
  onModeChange: (mode: "singles" | "parlay") => void;
  bulkStake: string;
  onBulkStakeChange: (value: string) => void;
  onApplyBulkStake: () => void;
  onShare: () => void;
  onSave: () => void;
  onClear: () => void;
  hasContent: boolean;
  copied: boolean;
}

export default function ToolbarRibbon({
  mode,
  onModeChange,
  bulkStake,
  onBulkStakeChange,
  onApplyBulkStake,
  onShare,
  onSave,
  onClear,
  hasContent,
  copied,
}: ToolbarRibbonProps) {
  const isSingles = mode === "singles";

  return (
    <div className="h-9 shrink-0 flex items-center justify-between px-2 border-b border-border bg-card/50">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-secondary rounded p-0.5">
          {(["singles", "parlay"] as const).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "px-2 py-0.5 text-[11px] font-mono font-medium rounded transition-colors capitalize",
                mode === m
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {isSingles && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-mono text-muted-foreground">Bulk stake:</span>
            <input
              type="number"
              value={bulkStake}
              onChange={(e) => onBulkStakeChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onApplyBulkStake()}
              placeholder="0"
              className="w-16 bg-secondary border border-border rounded px-1.5 py-0.5 text-[11px] font-mono text-right focus:outline-none focus:border-ring"
            />
            <button
              onClick={onApplyBulkStake}
              disabled={!bulkStake}
              className="text-[11px] font-mono text-primary hover:text-primary/80 disabled:text-muted-foreground/40 transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5">
        {hasContent && (
          <>
            <button
              onClick={onShare}
              className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              title="Share slip"
            >
              {copied ? <Check size={11} className="text-bet-won" /> : <Share2 size={11} />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-primary hover:bg-muted rounded transition-colors"
              title="Save slip"
            >
              <Save size={11} />
              <span className="hidden sm:inline">Save</span>
            </button>
          </>
        )}
        <button
          onClick={onClear}
          disabled={!hasContent}
          className="flex items-center gap-1 px-1.5 py-1 text-[11px] font-mono text-muted-foreground hover:text-bet-lost hover:bg-muted disabled:text-muted-foreground/30 rounded transition-colors"
          title="Clear all"
        >
          <Trash2 size={11} />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>
    </div>
  );
}
