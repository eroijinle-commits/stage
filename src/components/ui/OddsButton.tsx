import { useEffect, useRef, useState } from "react";
import { OddsButtonProps } from "@/lib/contracts/ui.contract";
import { cn } from "@/lib/utils/cn";

export default function OddsButton({ odds, name, active, selected, suspended, onClick, trend, className }: OddsButtonProps) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prevOdds = useRef(odds);

  useEffect(() => {
    if (prevOdds.current !== odds) {
      setFlash(odds > prevOdds.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 600);
      prevOdds.current = odds;
      return () => clearTimeout(t);
    }
  }, [odds]);

  const effectiveTrend = flash ?? trend;

  return (
    <button
      type="button"
      onClick={!suspended && active ? onClick : undefined}
      disabled={!active || suspended}
      className={cn(
        "flex flex-col items-center justify-center px-2 py-1.5 rounded border text-xs font-mono transition-all duration-150 min-w-[52px]",
        "disabled:cursor-not-allowed",
        selected
          ? "border-primary bg-primary/15 text-primary"
          : suspended
          ? "border-border bg-muted/30 text-muted-foreground"
          : "border-border bg-secondary text-foreground hover:border-primary/60 hover:bg-muted",
        effectiveTrend === "up" && "border-odds-up text-odds-up bg-odds-up/10",
        effectiveTrend === "down" && "border-odds-down text-odds-down bg-odds-down/10",
        className,
      )}
    >
      <span className="text-[10px] text-muted-foreground leading-none mb-0.5 truncate max-w-[56px]">{suspended ? "SUSP" : name}</span>
      <span className={cn(
        "font-semibold leading-none tabular-nums",
        effectiveTrend === "up" && "text-odds-up",
        effectiveTrend === "down" && "text-odds-down",
        selected && !effectiveTrend && "text-primary",
      )}>
        {odds.toFixed(2)}
      </span>
    </button>
  );
}
