import type { RiskLevel } from "@/lib/betarchitect/types";

const colors: Record<RiskLevel, string> = {
  low: "bg-bet-won",
  medium: "bg-bet-pending",
  high: "bg-orange-500",
  extreme: "bg-bet-lost",
};

const labels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Med",
  high: "High",
  extreme: "Extreme",
};

export default function RiskMeter({ level }: { level: RiskLevel }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {(["low", "medium", "high", "extreme"] as RiskLevel[]).map((l, i) => (
          <div
            key={l}
            className={`h-1.5 w-3 rounded-sm transition-colors ${
              i <= ["low", "medium", "high", "extreme"].indexOf(level) ? colors[level] : "bg-border"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] font-mono font-medium text-muted-foreground">
        {labels[level]}
      </span>
    </div>
  );
}
