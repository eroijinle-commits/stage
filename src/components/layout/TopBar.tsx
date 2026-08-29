import { useSlipStore } from "@/store/useSlipStore";
import { useUIStore } from "@/store/useUIStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBalance } from "@/hooks/useBalance";
import { cn } from "@/lib/utils/cn";
import { PanelLeft, ShoppingCart, Zap, Wallet, Loader2 } from "lucide-react";

interface TopBarProps { activePage: string; onNavigate: (page: string) => void; }

const NAV = [
  { id: "discovery", label: "Discovery" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

export default function TopBar({ activePage, onNavigate }: TopBarProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const toggleSlip = useUIStore((s) => s.toggleSlip);
  const selectionCount = useSlipStore((s) => s.selections.length);
  const apiToken = useSettingsStore((s) => s.apiToken);
  const currency = useSettingsStore((s) => s.currency);
  const { balance, isLoading, error } = useBalance();

  const renderBalance = () => {
    if (!apiToken) {
      return (
        <button onClick={() => onNavigate("settings")} className="flex items-center gap-1 text-xs font-mono text-muted-foreground/60 px-2 py-1 rounded border border-border/50 hover:border-border hover:text-muted-foreground transition-colors" title="Set API token in Settings">
          <Wallet size={11} />
          <span>No token</span>
        </button>
      );
    }
    if (isLoading) {
      return (
        <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground px-2 py-1 rounded border border-border">
          <Loader2 size={11} className="animate-spin" />
          <span>Loading…</span>
        </span>
      );
    }
    if (error) {
      return (
        <span className="text-xs font-mono text-bet-lost/70 px-2 py-1 rounded border border-border" title={error}>
          Error
        </span>
      );
    }
    if (balance) {
      return (
        <span className="text-xs font-mono text-muted-foreground px-2 py-1 rounded border border-border">
          {balance.currency} {balance.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
        </span>
      );
    }
    return null;
  };

  return (
    <header className="h-11 flex items-center justify-between px-3 border-b border-border bg-card shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button onClick={() => toggleSidebar()} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <PanelLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5">
          <Zap size={14} className="text-primary" />
          <span className="text-sm font-mono font-bold text-foreground tracking-tight">Stage</span>
        </div>
        <nav className="flex items-center gap-0.5 ml-3">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => onNavigate(n.id)}
              className={cn(
                "px-3 py-1 text-xs font-mono rounded transition-colors",
                activePage === n.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              {n.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {renderBalance()}
        <button
          onClick={() => toggleSlip()}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors border",
            selectionCount > 0
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <ShoppingCart size={13} />
          <span>Slip</span>
          {selectionCount > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
              {selectionCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
