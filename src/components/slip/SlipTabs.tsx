import { cn } from "@/lib/utils/cn";

export const TABS = [
  { id: "manual", label: "Manual" },
  { id: "compute", label: "Compute" },
  { id: "saved", label: "Saved" },
] as const;

export type SlipTabId = (typeof TABS)[number]["id"];

interface SlipTabsProps {
  activeTab: SlipTabId;
  onTabChange: (tabId: SlipTabId) => void;
  badges?: Partial<Record<SlipTabId, number>>;
}

export default function SlipTabs({ activeTab, onTabChange, badges }: SlipTabsProps) {
  return (
    <div className="h-8 shrink-0 flex items-center gap-1 px-2 border-b border-border">
      {TABS.map((t) => {
        const count = badges?.[t.id] ?? 0;
        const active = activeTab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-medium rounded transition-colors",
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
          </button>
        );
      })}
    </div>
  );
}
