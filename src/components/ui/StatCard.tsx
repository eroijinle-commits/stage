import { StatCardProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import Skeleton from "./Skeleton";

function fmt(value: string | number, format?: StatCardProps["format"], currency = "NGN") {
  if (typeof value === "string") return value;
  if (format === "currency") return `${currency} ${value.toLocaleString("en-NG")}`;
  if (format === "percentage") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

export default function StatCard({ title, value, change, changeLabel, icon, trend, loading, format, currency }: StatCardProps) {
  if (loading) return (
    <div className="bg-card border border-border rounded p-4 flex flex-col gap-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-bet-won" : trend === "down" ? "text-bet-lost" : "text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{title}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-mono font-bold text-foreground tabular-nums">{fmt(value, format, currency)}</div>
      {(change !== undefined || changeLabel) && (
        <div className={cn("flex items-center gap-1 text-xs font-mono", trendColor)}>
          <TrendIcon size={12} />
          {change !== undefined && <span>{change > 0 ? "+" : ""}{change.toFixed(1)}%</span>}
          {changeLabel && <span className="text-muted-foreground ml-0.5">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
