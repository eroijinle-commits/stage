import { cn } from "@/lib/utils/cn";
import { X, Plus, MoreHorizontal } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

export type SlipTabId = string;

interface TabDef {
  id: SlipTabId;
  label: string;
  closable?: boolean;
}

interface SlipTabsProps {
  tabs: TabDef[];
  activeTab: SlipTabId;
  totalCount: number;
  onTabChange: (tabId: SlipTabId) => void;
  onTabClose?: (tabId: SlipTabId) => void;
  onTabRename?: (tabId: SlipTabId, name: string) => void;
  onTabDuplicate?: (tabId: SlipTabId) => void;
  onTabClear?: (tabId: SlipTabId) => void;
  onNewSlip?: () => void;
  badges?: Partial<Record<SlipTabId, number>>;
}

export default function SlipTabs({
  tabs,
  activeTab,
  totalCount,
  onTabChange,
  onTabClose,
  onTabRename,
  onTabDuplicate,
  onTabClear,
  onNewSlip,
  badges,
}: SlipTabsProps) {
  return (
    <div className="h-8 shrink-0 flex items-center gap-1 px-2 border-b border-border overflow-x-auto">
      {tabs.map((t) => {
        const count = badges?.[t.id] ?? 0;
        const active = activeTab === t.id;
        return (
          <TabItem
            key={t.id}
            tab={t}
            active={active}
            count={count}
            onTabChange={onTabChange}
            onTabClose={onTabClose}
            onTabRename={onTabRename}
            onTabDuplicate={onTabDuplicate}
            onTabClear={onTabClear}
          />
        );
      })}
      {onNewSlip && (
        <button
          onClick={onNewSlip}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors shrink-0"
          title="New slip"
        >
          <Plus size={10} />
        </button>
      )}
      <span className="ml-auto shrink-0 text-[10px] font-mono text-muted-foreground/60 tabular-nums">
        {totalCount}
      </span>
    </div>
  );
}

interface TabItemProps {
  tab: TabDef;
  active: boolean;
  count: number;
  onTabChange: (tabId: SlipTabId) => void;
  onTabClose?: (tabId: SlipTabId) => void;
  onTabRename?: (tabId: SlipTabId, name: string) => void;
  onTabDuplicate?: (tabId: SlipTabId) => void;
  onTabClear?: (tabId: SlipTabId) => void;
}

function TabItem({
  tab,
  active,
  count,
  onTabChange,
  onTabClose,
  onTabRename,
  onTabDuplicate,
  onTabClear,
}: TabItemProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tab.label);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const confirmRename = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tab.label) {
      onTabRename?.(tab.id, trimmed);
    }
    setEditing(false);
  }, [editValue, tab.id, tab.label, onTabRename]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(tab.label);
    setEditing(true);
  }, [tab.label]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") confirmRename();
      if (e.key === "Escape") setEditing(false);
    },
    [confirmRename],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setMenuOpen(true);
  }, []);

  return (
    <div className="relative group shrink-0">
      <button
        onClick={() => onTabChange(tab.id)}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        className={cn(
          "group/btn flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-medium rounded transition-colors whitespace-nowrap",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted",
        )}
      >
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={confirmRename}
            onKeyDown={handleKeyDown}
            className="w-16 bg-secondary border border-border rounded px-1 py-0 text-[11px] font-mono focus:outline-none focus:border-ring"
            maxLength={30}
          />
        ) : (
          <>
            <span className="max-w-[120px] truncate">{tab.label}</span>
            {count > 0 && (
              <span className="bg-primary/20 text-primary rounded-sm px-1 text-[10px] tabular-nums leading-none">
                {count}
              </span>
            )}
          </>
        )}

        {/* Close button — visible on hover or active */}
        {tab.closable && onTabClose && !editing && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(tab.id);
            }}
            className={cn(
              "transition-colors p-0.5 rounded-sm",
              active
                ? "text-muted-foreground/70 hover:text-bet-lost"
                : "text-muted-foreground/30 group-hover/btn:text-muted-foreground/70 hover:text-bet-lost",
            )}
            title="Close slip"
          >
            <X size={10} />
          </span>
        )}

        {/* Dropdown trigger */}
        {!editing && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={cn(
              "transition-colors p-0.5 rounded-sm",
              active
                ? "text-muted-foreground/70 hover:text-foreground"
                : "text-muted-foreground/0 group-hover/btn:text-muted-foreground/50 hover:text-foreground",
            )}
            title="Slip options"
          >
            <MoreHorizontal size={10} />
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded shadow-lg min-w-[140px] py-1 text-[11px] font-mono"
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              handleDoubleClick();
            }}
            className="w-full text-left px-3 py-1 hover:bg-muted transition-colors"
          >
            Rename
          </button>
          {onTabDuplicate && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onTabDuplicate(tab.id);
              }}
              className="w-full text-left px-3 py-1 hover:bg-muted transition-colors"
            >
              Duplicate
            </button>
          )}
          {onTabClear && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onTabClear(tab.id);
              }}
              className="w-full text-left px-3 py-1 hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
          {tab.closable && onTabClose && (
            <>
              <div className="border-t border-border my-1" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onTabClose(tab.id);
                }}
                className="w-full text-left px-3 py-1 hover:bg-muted text-bet-lost transition-colors"
              >
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
