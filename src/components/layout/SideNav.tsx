import { useUIStore } from "@/store/useUIStore";
import { cn } from "@/lib/utils/cn";
import { Trophy, Globe, Tv, Dumbbell, ChevronRight } from "lucide-react";

const SPORTS = [
  { id: "football", label: "Football", icon: Trophy, count: 124 },
  { id: "basketball", label: "Basketball", icon: Globe, count: 48 },
  { id: "tennis", label: "Tennis", icon: Tv, count: 32 },
  { id: "cricket", label: "Cricket", icon: Dumbbell, count: 18 },
  { id: "rugby", label: "Rugby", icon: Globe, count: 12 },
];

const TOURNAMENTS = [
  "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1",
  "Champions League", "Europa League", "FA Cup", "Carabao Cup",
];

interface SideNavProps { activeSport: string; onSportChange: (s: string) => void; }

export default function SideNav({ activeSport, onSportChange }: SideNavProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <aside className={cn(
      "flex flex-col border-r border-border bg-card shrink-0 transition-all duration-200 overflow-hidden",
      collapsed ? "w-0" : "w-48",
    )}>
      <div className="p-2 border-b border-border">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1">Sports</p>
        {SPORTS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => onSportChange(s.id)}
              className={cn(
                "w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono transition-colors",
                activeSport === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <div className="flex items-center gap-2">
                <Icon size={12} />
                <span>{s.label}</span>
              </div>
              <span className="text-[10px] tabular-nums">{s.count}</span>
            </button>
          );
        })}
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1">Tournaments</p>
        {TOURNAMENTS.map((t) => (
          <button
            key={t}
            className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ChevronRight size={10} className="shrink-0" />
            <span className="truncate">{t}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
