import { cn } from "@/lib/utils/cn";

const TABS = [
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
    <div className="flex items-center gap-1 border-b border-border px-4 pt-2 shrink-0">
      {TABS.map((t) => {
        const count = badges?.[t.id] ?? 0;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded-t transition-colors",
              activeTab === t.id
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted",
            )}
          >
            {t.label}
            {count > 0 && (
              <span className="bg-primary/20 text-primary rounded-full px-1.5 text-[10px] font-bold tabular-nums">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
