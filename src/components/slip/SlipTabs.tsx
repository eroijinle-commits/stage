import { cn } from "@/lib/utils/cn";
import { X } from "lucide-react";

export const STATIC_TABS = [
  { id: "manual", label: "Manual", type: "manual" as const },
  { id: "saved", label: "Saved", type: "saved" as const },
] as const;

export type SlipTabId = string;

interface TabDef {
  id: SlipTabId;
  label: string;
  type: "manual" | "compute" | "saved";
  closable?: boolean;
}

interface SlipTabsProps {
  tabs: TabDef[];
  activeTab: SlipTabId;
  onTabChange: (tabId: SlipTabId) => void;
  onTabClose?: (tabId: SlipTabId) => void;
  badges?: Partial<Record<SlipTabId, number>>;
}

export default function SlipTabs({ tabs, activeTab, onTabChange, onTabClose, badges }: SlipTabsProps) {
  return (
    <div className="h-8 shrink-0 flex items-center gap-1 px-2 border-b border-border overflow-x-auto">
      {tabs.map((t) => {
        const count = badges?.[t.id] ?? 0;
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "group flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-medium rounded transition-colors whitespace-nowrap shrink-0",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            <span>{t.label}</span>
            {count > 0 && (
              <span className="bg-primary/20 text-primary rounded-sm px-1 text-[10px] tabular-nums leading-none">
                {count}
              </span>
            )}
            {t.closable && onTabClose && (
              <span
                onClick={(e) => { e.stopPropagation(); onTabClose(t.id); }}
                className="text-muted-foreground/50 hover:text-bet-lost transition-colors p-0.5 rounded-sm"
                title="Close slip"
              >
                <X size={10} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
