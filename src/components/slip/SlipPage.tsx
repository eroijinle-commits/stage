import { useState, useMemo, useCallback, useEffect } from "react";
import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { calculatePotentialReturn, calculateTotalStake, getShieldFeeRate } from "@/lib/state/slipLogic";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui";
import SlipTabs, { type SlipTabId } from "@/components/slip/SlipTabs";
import ToolbarRibbon from "@/components/slip/ToolbarRibbon";
import ManualTab from "@/components/slip/SlipVariantA";
import ComputeSlipDetail from "@/components/slip/ComputeSlipDetail";
import SavedSlipList from "@/components/slip/SavedSlipList";
import OrderPanel from "@/components/slip/OrderPanel";
import BottomBar from "@/components/slip/BottomBar";
import type { ComputeSlipEntry } from "@/store/useSlipStore";

type TabType = "manual" | "compute" | "saved";

interface TabDef {
  id: SlipTabId;
  label: string;
  type: TabType;
  closable?: boolean;
  slipId?: string;
}

export default function SlipPage() {
  const [activeTab, setActiveTab] = useState<SlipTabId>("manual");
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [stakes, setStakes] = useState<Record<string, number>>({});
  const [bulkStake, setBulkStake] = useState("");
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    selections, mode, stakePerLeg, stakeShieldEnabled, isPlacing, placeResults,
    potentialReturn, totalStake, placeBets, clearSelections, setMode, setStakePerLeg,
    setStakeShieldEnabled, computeSlips, removeComputeSlip, placeBetsForGroup,
    updateComputeSlip,
  } = useBetSlip();

  const savedSlips = useSlipStore((s) => s.savedSlips);
  const loadSlip = useSlipStore((s) => s.loadSlip);
  const deleteSlip = useSlipStore((s) => s.deleteSlip);
  const saveSlip = useSlipStore((s) => s.saveSlip);
  const shareSlip = useSlipStore((s) => s.shareSlip);
  const currency = useSettingsStore((s) => s.currency);

  const tabs: TabDef[] = useMemo(() => {
    const list: TabDef[] = [
      { id: "manual", label: "Manual", type: "manual" },
    ];
    for (const slip of computeSlips) {
      list.push({
        id: `compute:${slip.id}`,
        label: slip.name,
        type: "compute",
        closable: true,
        slipId: slip.id,
      });
    }
    list.push({ id: "saved", label: "Saved", type: "saved" });
    return list;
  }, [computeSlips]);

  const activeComputeSlip = useMemo(() => {
    if (!activeTab.startsWith("compute:")) return null;
    const id = activeTab.slice("compute:".length);
    return computeSlips.find((s) => s.id === id) ?? null;
  }, [activeTab, computeSlips]);

  useEffect(() => {
    if (activeTab.startsWith("compute:") && !activeComputeSlip) {
      setActiveTab("manual");
    }
  }, [activeComputeSlip, activeTab]);

  const applyBulkStake = useCallback(() => {
    const val = parseFloat(bulkStake);
    if (isNaN(val) || val <= 0) return;
    const map: Record<string, number> = {};
    for (const s of selections) map[s.id] = val;
    setStakes(map);
    setBulkStake("");
  }, [bulkStake, selections]);

  const handleStakeChange = useCallback((id: string, value: number) => {
    setStakes((prev) => ({ ...prev, [id]: value }));
  }, []);

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

  const handleLoad = useCallback((id: string) => {
    loadSlip(id);
    setActiveTab("manual");
  }, [loadSlip]);

  const handleTabClose = useCallback((tabId: string) => {
    if (!tabId.startsWith("compute:")) return;
    removeComputeSlip(tabId.slice("compute:".length));
  }, [removeComputeSlip]);

  const manualDisplayReturn = useMemo(() => {
    return mode === "singles"
      ? selections.reduce((acc, s) => acc + (stakes[s.id] ?? stakePerLeg) * s.odds, 0)
      : (() => {
        let r = stakePerLeg * selections.reduce((acc, s) => acc * s.odds, 1);
        if (stakeShieldEnabled && selections.length >= 3) r *= (1 - getShieldFeeRate(selections.length));
        return Math.round(r * 100) / 100;
      })();
  }, [mode, selections, stakes, stakePerLeg, stakeShieldEnabled]);

  const manualTotalStake = useMemo(() => {
    return mode === "singles"
      ? selections.reduce((acc, s) => acc + (stakes[s.id] ?? stakePerLeg), 0)
      : stakePerLeg;
  }, [mode, selections, stakes, stakePerLeg]);

  const manualProfit = manualDisplayReturn - manualTotalStake;
  const placed = placeResults.length > 0;

  const computeSummary = useMemo(() => {
    let totalStake = 0;
    let totalReturn = 0;
    let selectionCount = 0;
    for (const slip of computeSlips) {
      totalStake += calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
      totalReturn += calculatePotentialReturn(slip.selections, slip.mode, slip.stakePerLeg, undefined, slip.stakeShieldEnabled);
      selectionCount += slip.selections.length;
    }
    return { slipCount: computeSlips.length, selectionCount, totalStake, totalReturn, currency };
  }, [computeSlips, currency]);

  const activeComputeSummary = useMemo(() => {
    if (!activeComputeSlip) return null;
    const slip = activeComputeSlip;
    const totalStake = calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
    const totalReturn = calculatePotentialReturn(slip.selections, slip.mode, slip.stakePerLeg, undefined, slip.stakeShieldEnabled);
    const totalOdds = slip.selections.reduce((acc, s) => acc * s.odds, 1);
    return {
      mode: slip.mode,
      selectionCount: slip.selections.length,
      currency,
      totalStake,
      totalReturn,
      displayReturn: totalReturn,
      potentialProfit: totalReturn - totalStake,
      stakePerLeg: slip.stakePerLeg,
      stakeShieldEnabled: slip.stakeShieldEnabled,
      totalOdds: slip.mode === "parlay" ? totalOdds : undefined,
      slipId: slip.id,
      slipCount: 1,
    };
  }, [activeComputeSlip, currency]);

  const savedSummary = useMemo(() => ({
    slipCount: savedSlips.length,
    selectionCount: savedSlips.reduce((acc, s) => acc + s.selections.length, 0),
  }), [savedSlips]);

  const hasContent = selections.length > 0 || computeSlips.length > 0;

  const handleComputeStakeChange = useCallback((value: number) => {
    if (!activeComputeSlip) return;
    updateComputeSlip(activeComputeSlip.id, { stakePerLeg: value });
  }, [activeComputeSlip, updateComputeSlip]);

  const handleComputeStakeShieldToggle = useCallback(() => {
    if (!activeComputeSlip) return;
    updateComputeSlip(activeComputeSlip.id, { stakeShieldEnabled: !activeComputeSlip.stakeShieldEnabled });
  }, [activeComputeSlip, updateComputeSlip]);

  const handleComputePlace = useCallback(() => {
    if (!activeComputeSlip) return;
    placeBetsForGroup(activeComputeSlip.id);
  }, [activeComputeSlip, placeBetsForGroup]);

  const badges = useMemo(() => {
    const map: Partial<Record<string, number>> = {};
    map.manual = selections.length || undefined;
    for (const slip of computeSlips) {
      map[`compute:${slip.id}`] = slip.selections.length || undefined;
    }
    map.saved = savedSlips.length || undefined;
    return map;
  }, [computeSlips, selections.length, savedSlips.length]);

  const activeTabType: TabType = activeComputeSlip ? "compute" : activeTab === "saved" ? "saved" : "manual";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SlipTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onTabClose={handleTabClose}
        badges={badges}
      />

      {activeTabType === "manual" && (
        <ToolbarRibbon
          mode={mode}
          onModeChange={handleModeChange}
          bulkStake={bulkStake}
          onBulkStakeChange={setBulkStake}
          onApplyBulkStake={applyBulkStake}
          onShare={handleShare}
          onSave={handleSave}
          onClear={() => { clearSelections(); }}
          hasContent={selections.length > 0}
          copied={copied}
        />
      )}

      {showSaveInput && activeTabType === "manual" && selections.length > 0 && (
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
          {activeTabType === "manual" && (
            <ManualTab
              stakes={stakes}
              onStakeChange={handleStakeChange}
              bulkStake={bulkStake}
              onBulkStakeChange={setBulkStake}
              onApplyBulkStake={applyBulkStake}
            />
          )}
          {activeTabType === "compute" && activeComputeSlip && (
            <ComputeSlipDetail
              slip={activeComputeSlip}
              currency={currency}
              onRemove={() => removeComputeSlip(activeComputeSlip.id)}
              onPlaceBets={() => placeBetsForGroup(activeComputeSlip.id)}
            />
          )}
          {activeTabType === "saved" && (
            <SavedSlipList
              slips={savedSlips}
              onLoad={handleLoad}
              onDelete={deleteSlip}
            />
          )}

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
          activeTab={activeTabType}
          manualSummary={{
            mode,
            selectionCount: selections.length,
            currency,
            totalStake: manualTotalStake,
            displayReturn: manualDisplayReturn,
            potentialProfit: manualProfit,
            stakePerLeg,
            stakeShieldEnabled,
            totalOdds: mode === "parlay" ? selections.reduce((acc, s) => acc * s.odds, 1) : undefined,
          }}
          computeSummary={activeComputeSummary ?? computeSummary}
          savedSummary={savedSummary}
          onStakeChange={activeComputeSlip ? handleComputeStakeChange : setStakePerLeg}
          onStakeShieldToggle={activeComputeSlip ? handleComputeStakeShieldToggle : () => setStakeShieldEnabled(!stakeShieldEnabled)}
          onPlaceBets={activeComputeSlip ? handleComputePlace : placeBets}
          onClear={activeComputeSlip ? () => removeComputeSlip(activeComputeSlip.id) : clearSelections}
          isPlacing={isPlacing}
          placed={placed}
        />
      </div>

      {activeTabType === "manual" && (
        <BottomBar
          selectionCount={selections.length}
          currency={currency}
          totalStake={manualTotalStake}
          displayReturn={manualDisplayReturn}
          potentialProfit={manualProfit}
          isPlacing={isPlacing}
          placed={placed}
          onPlaceBets={placeBets}
          onClear={clearSelections}
        />
      )}
      {activeTabType === "compute" && activeComputeSlip && (
        <BottomBar
          selectionCount={activeComputeSlip.selections.length}
          currency={currency}
          totalStake={activeComputeSummary?.totalStake ?? 0}
          displayReturn={activeComputeSummary?.displayReturn ?? 0}
          potentialProfit={activeComputeSummary?.potentialProfit ?? 0}
          isPlacing={activeComputeSlip.isPlacing}
          placed={activeComputeSlip.placeResults.length > 0}
          onPlaceBets={handleComputePlace}
          onClear={() => removeComputeSlip(activeComputeSlip.id)}
        />
      )}
    </div>
  );
}
