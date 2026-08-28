import { useState, useRef, useEffect } from "react";
import { BetTypeConfig } from "@/lib/contracts/ui.contract";
import { BET_TYPES, getPopularBetTypes, getBetTypesByCategory, CATEGORY_ORDER, CATEGORY_LABELS, getBetTypesForSport } from "@/lib/utils/bet-type-mapper";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, X, Flame, Trophy, Goal, Flag, Square, User, Target } from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Trophy, Flag, Square, User, Target,
  Goal: () => <span className="text-[13px]">⚽</span>,
  Scale: () => <span className="text-[13px]">⚖</span>,
  CheckCircle2: () => <span className="text-[13px]">✓</span>,
  Clock: () => <span className="text-[13px]">⏱</span>,
  UserCheck: User,
  FlagTriangleRight: Flag,
  Shield: () => <span className="text-[13px]">🛡</span>,
  ShieldCheck: () => <span className="text-[13px]">🛡</span>,
  GitFork: () => <span className="text-[13px]">⑂</span>,
  Undo2: () => <span className="text-[13px]">↩</span>,
};

function BetTypeIcon({ icon, size = 13 }: { icon: string; size?: number }) {
  const C = ICONS[icon];
  return C ? <C size={size} /> : <span className="text-[13px]">○</span>;
}

interface BetTypeSelectorProps {
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  sport?: string;
}

export default function BetTypeSelector({ value, onChange, label = "Bet Type", sport }: BetTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const allForSport = sport ? getBetTypesForSport(sport) : BET_TYPES;
  const selected = value ? allForSport.find((b) => b.id === value) : null;
  const popular = allForSport.filter((b) => b.popular);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const filtered = search
    ? allForSport.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleSelect = (bt: BetTypeConfig | null) => {
    onChange(bt?.id ?? null);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      {label && <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center justify-between bg-secondary border border-border rounded px-2.5 py-1.5 text-sm font-mono text-left",
            "hover:border-ring/50 focus:outline-none focus:border-ring min-w-[180px]",
            open && "border-ring/50",
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            {selected ? (
              <>
                <span className="text-muted-foreground shrink-0"><BetTypeIcon icon={selected.icon} /></span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">All Bet Types</span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-1">
            {selected && (
              <span onClick={(e) => { e.stopPropagation(); handleSelect(null); }} className="text-muted-foreground hover:text-foreground">
                <X size={11} />
              </span>
            )}
            <ChevronDown size={13} className={cn("text-muted-foreground transition-transform", open && "rotate-180")} />
          </div>
        </button>

        {open && (
          <div className="absolute z-50 w-72 mt-1 bg-card border border-border rounded shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bet types..."
                className="w-full bg-secondary border border-border rounded px-2.5 py-1 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring"
              />
            </div>
            <div className="overflow-y-auto max-h-80">
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs font-mono hover:bg-muted transition-colors", !value && "text-primary")}
              >
                <span className="text-muted-foreground">∅</span>
                <span>All Bet Types</span>
              </button>

              {filtered ? (
                filtered.map((bt) => <BetTypeItem key={bt.id} bt={bt} selected={value === bt.id} onSelect={handleSelect} />)
              ) : (
                <>
                  <div className="px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono text-primary uppercase tracking-wider">
                    <Flame size={10} />
                    <span>Popular</span>
                  </div>
                  {popular.map((bt) => <BetTypeItem key={bt.id} bt={bt} selected={value === bt.id} onSelect={handleSelect} />)}

                  {CATEGORY_ORDER.filter((cat) => allForSport.filter((b) => b.category === cat && !b.popular).length > 0).map((cat) => {
                    const items = allForSport.filter((b) => b.category === cat && !b.popular);
                    if (!items.length) return null;
                    return (
                      <div key={cat}>
                        <div className="px-3 py-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider border-t border-border mt-1">
                          {CATEGORY_LABELS[cat]}
                        </div>
                        {items.map((bt) => <BetTypeItem key={bt.id} bt={bt} selected={value === bt.id} onSelect={handleSelect} />)}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BetTypeItem({ bt, selected, onSelect }: { bt: BetTypeConfig; selected: boolean; onSelect: (bt: BetTypeConfig) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(bt)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono hover:bg-muted transition-colors text-left",
        selected && "bg-primary/10 text-primary",
      )}
    >
      <span className={cn("shrink-0", selected ? "text-primary" : "text-muted-foreground")}>
        <BetTypeIcon icon={bt.icon} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="truncate">{bt.name}</div>
        {!selected && <div className="text-[10px] text-muted-foreground truncate">{bt.description}</div>}
      </div>
      {bt.hasLines && <span className="text-[10px] text-muted-foreground shrink-0">lines</span>}
    </button>
  );
}
