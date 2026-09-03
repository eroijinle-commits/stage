import { useState, useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { cn } from "@/lib/utils/cn";
import { getSportIndex } from "@/lib/stake-api";
import { Trophy, Globe, Tv, Dumbbell, ChevronRight, X, Loader2, Layers } from "lucide-react";

const SPORTS = [
  { id: "soccer", label: "Soccer", icon: Trophy },
  { id: "tennis", label: "Tennis", icon: Tv },
  { id: "cricket", label: "Cricket", icon: Dumbbell },
  { id: "american-football", label: "American Football", icon: Globe },
  { id: "baseball", label: "Baseball", icon: Globe },
];

interface TournamentItem {
  name: string;
  slug: string;
  category: { name: string };
}

interface SideNavProps {
  activeSport: string;
  onSportChange: (s: string) => void;
  selectedTournamentSlugs?: string[];
  onTournamentToggle?: (slug: string) => void;
  onNavigate?: (page: string) => void;
}

export default function SideNav({
  activeSport,
  onSportChange,
  selectedTournamentSlugs = [],
  onTournamentToggle,
  onNavigate,
}: SideNavProps) {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const apiToken = useSettingsStore((s) => s.apiToken);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // Fetch tournaments when sport changes
  useEffect(() => {
    if (!apiToken) return;
    let cancelled = false;
    setLoadingTournaments(true);
    setTournaments([]);

    getSportIndex(activeSport, "popular", "popular", 1)
      .then((data) => {
        if (cancelled) return;
        const all: TournamentItem[] = [];
        for (const cat of data.sport.categories) {
          for (const t of cat.tournaments) {
            all.push({ name: t.name, slug: t.slug, category: { name: cat.name } });
          }
        }
        setTournaments(all);
      })
      .catch(() => {
        if (!cancelled) setTournaments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingTournaments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeSport, apiToken]);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-card shrink-0 transition-all duration-200 overflow-hidden",
        collapsed ? "w-0" : "w-48",
      )}
    >
      {/* Tools section */}
      <div className="p-2 border-b border-border">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1">
          Tools
        </p>
        <button
          onClick={() => onNavigate?.("betarchitect")}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Layers size={12} />
          <span>BetArchitect</span>
        </button>
      </div>
      <div className="p-2 border-b border-border">
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider px-2 py-1">
          Sports
        </p>
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
            </button>
          );
        })}
      </div>
      <div className="p-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-1">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            Tournaments
          </p>
          {selectedTournamentSlugs.length > 0 && onTournamentToggle && (
            <button
              onClick={() => selectedTournamentSlugs.forEach((s) => onTournamentToggle(s))}
              className="text-[10px] font-mono text-primary hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        {loadingTournaments ? (
          <div className="flex items-center gap-1.5 px-2 py-1">
            <Loader2 size={10} className="animate-spin text-muted-foreground" />
            <span className="text-[10px] font-mono text-muted-foreground">Loading...</span>
          </div>
        ) : tournaments.length === 0 ? (
          <p className="text-[10px] font-mono text-muted-foreground px-2 py-1">No tournaments</p>
        ) : (
          tournaments.map((t) => {
            const isSelected = selectedTournamentSlugs.includes(t.name);
            return (
              <button
                key={t.slug}
                onClick={() => onTournamentToggle?.(t.name)}
                className={cn(
                  "w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors",
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <ChevronRight size={10} className="shrink-0" />
                <span className="truncate">{t.name}</span>
                {isSelected && <X size={10} className="ml-auto shrink-0" />}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
