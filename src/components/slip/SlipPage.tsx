import { useState, useMemo, useCallback } from "react";
import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { getShieldFeeRate } from "@/lib/state/slipLogic";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui";
import SlipTabs, { type SlipTabId } from "@/components/slip/SlipTabs";
import ToolbarRibbon from "@/components/slip/ToolbarRibbon";
import ManualTab from "@/components/slip/SlipVariantA";
import OrderPanel from "@/components/slip/OrderPanel";
import BottomBar from "@/components/slip/BottomBar";

export default function SlipPage() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [bulkStake, setBulkStake] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    selections, mode, stakePerLeg, stakeShieldEnabled, isPlacing, placeResults,
    placeBets, clearSelections, setMode,
    setStakeShieldEnabled, allSlips, createSlip, deleteSlip, switchSlip,
  } = useBetSlip();

  const saveSlip = useSlipStore((s) => s.saveSlip);
  const shareSlip = useSlipStore((s) => s.shareSlip);
  const activeSlipId = useSlipStore((s) => s.activeSlipId);
  const renameSlip = useSlipStore((s) => s.renameSlip);
  const duplicateSlip = useSlipStore((s) => s.duplicateSlip);
  const clearSlip = useSlipStore((s) => s.clearSlip);
  const currency = useSettingsStore((s) => s.currency);

  const currentTabId = useMemo(() => {
    if (!activeSlipId && allSlips.length > 0) return allSlips[0].id;
    return activeSlipId;
  }, [activeSlipId, allSlips]);

  const handleTabChange = useCallback((tabId: SlipTabId) => {
    switchSlip(tabId);
  }, [switchSlip]);

  const handleNewSlip = useCallback(() => {
    createSlip();
  }, [createSlip]);

  const handleTabClose = useCallback((tabId: SlipTabId) => {
    if (allSlips.length <= 1) return;
    deleteSlip(tabId);
  }, [allSlips.length, deleteSlip]);

  const handleTabRename = useCallback((tabId: SlipTabId, name: string) => {
    renameSlip(tabId, name);
  }, [renameSlip]);

  const handleTabDuplicate = useCallback((tabId: SlipTabId) => {
    duplicateSlip(tabId);
  }, [duplicateSlip]);

  const handleTabClear = useCallback((tabId: SlipTabId) => {
    clearSlip(tabId);
  }, [clearSlip]);

  // ── Active slip calculations ───────────────────────────────────────────
  const activeSlipSelectionCount = selections.length;

  const activeManualTotalStake = useMemo(() => {
    return mode === "singles"
      ? selections.reduce((acc, s) => acc + stakePerLeg, 0)
      : stakePerLeg;
  }, [mode, selections, stakePerLeg]);

  const activeDisplayReturn = useMemo(() => {
    return mode === "singles"
      ? selections.reduce((acc, s) => acc + stakePerLeg * s.odds, 0)
      : (() => {
        let r = stakePerLeg * selections.reduce((acc, s) => acc * s.odds, 1);
        if (stakeShieldEnabled && selections.length >= 3) r *= (1 - getShieldFeeRate(selections.length));
        return Math.round(r * 100) / 100;
      })();
  }, [mode, selections, stakePerLeg, stakeShieldEnabled]);

  const activeProfit = activeDisplayReturn - activeManualTotalStake;
  const placed = placeResults.length > 0;
  const totalOdds = mode === "parlay" ? selections.reduce((acc, s) => acc * s.odds, 1) : undefined;

  const handleModeChange = useCallback((m: "singles" | "parlay") => {
    setMode(m);
    if (m !== "parlay") setStakeShieldEnabled(false);
  }, [setMode, setStakeShieldEnabled]);

  const handleShare = useCallback(() => {
    const data = shareSlip();
    if (!data) return;
    const text = data.link
      ? `${data.code}\nStake fixture: ${data.link}\nRestore in Stage: ${data.stageLink}`
      : data.stageLink;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      prompt("Copy this slip:", text);
    });
  }, [shareSlip]);

  const handleSave = useCallback(() => {
    if (!saveName.trim()) {
      setShowSaveInput(true);
      return;
    }
    saveSlip(saveName.trim());
    setSaveName("");
    setShowSaveInput(false);
  }, [saveName, saveSlip]);

  const badges = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    for (const slip of allSlips) {
      map[slip.id] = slip.selections.length || undefined;
    }
    return map;
  }, [allSlips]);

  const totalSelectionCount = useMemo(
    () => allSlips.reduce((acc, s) => acc + s.selections.length, 0),
    [allSlips],
  );

  const handleStakeShieldToggle = useCallback(() => {
    setStakeShieldEnabled(!stakeShieldEnabled);
  }, [stakeShieldEnabled, setStakeShieldEnabled]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SlipTabs
        tabs={allSlips.map((s) => ({
          id: s.id,
          label: s.name,
          closable: allSlips.length > 1,
        }))}
        activeTab={currentTabId}
        totalCount={totalSelectionCount}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
        onTabRename={handleTabRename}
        onTabDuplicate={handleTabDuplicate}
        onTabClear={handleTabClear}
        onNewSlip={handleNewSlip}
        badges={badges}
      />

      {activeSlipSelectionCount > 0 && (
        <ToolbarRibbon
          mode={mode}
          onModeChange={handleModeChange}
          bulkStake={bulkStake}
          onBulkStakeChange={setBulkStake}
          onApplyBulkStake={() => {
            const val = parseFloat(bulkStake);
            if (isNaN(val) || val <= 0) return;
            setBulkStake("");
          }}
          onShare={handleShare}
          onSave={handleSave}
          onClear={() => { clearSelections(); }}
          hasContent={activeSlipSelectionCount > 0}
          copied={copied}
        />
      )}

      {showSaveInput && activeSlipSelectionCount > 0 && (
        <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-border bg-card/30">
          <span className="text-[11px] font-mono text-muted-foreground">Save as:</span>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            placeholder="Slip name"
            className="flex-1 max-w-xs bg-secondary border border-border rounded px-2 py-0.5 text-[11px] font-mono focus:outline-none focus:border-ring"
            autoFocus
          />
          <Button variant="primary" size="sm" className="px-2 py-0.5 text-[10px]" onClick={handleSave} disabled={!saveName.trim()}>
            Save
          </Button>
          <Button variant="ghost" size="sm" className="px-2 py-0.5 text-[10px]" onClick={() => { setShowSaveInput(false); setSaveName(""); }}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          <ManualTab bulkStake={bulkStake} onBulkStakeChange={setBulkStake} />

          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="absolute right-0 top-[72px] z-10 text-muted-foreground hover:text-foreground bg-card border border-border rounded-l p-1"
              title="Open order panel"
            >
              <PanelRight size={14} />
            </button>
          )}
        </div>

        <OrderPanel
          open={rightPanelOpen}
          onToggle={() => setRightPanelOpen((v) => !v)}
          activeTab="manual"
          manualSummary={{
            mode,
            selectionCount: activeSlipSelectionCount,
            currency,
            totalStake: activeManualTotalStake,
            displayReturn: activeDisplayReturn,
            potentialProfit: activeProfit,
            stakePerLeg,
            stakeShieldEnabled,
            totalOdds,
          }}
          onStakeChange={(value) => {
            useSlipStore.getState().setStakePerLeg(value);
          }}
          onStakeShieldToggle={handleStakeShieldToggle}
          onPlaceBets={placeBets}
          onClear={clearSelections}
          isPlacing={isPlacing}
          placed={placed}
        />
      </div>

      {activeSlipSelectionCount > 0 && (
        <BottomBar
          selectionCount={activeSlipSelectionCount}
          currency={currency}
          totalStake={activeManualTotalStake}
          displayReturn={activeDisplayReturn}
          potentialProfit={activeProfit}
          isPlacing={isPlacing}
          placed={placed}
          onPlaceBets={placeBets}
          onClear={clearSelections}
        />
      )}
    </div>
  );
}
