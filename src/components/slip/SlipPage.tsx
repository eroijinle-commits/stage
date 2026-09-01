import { useState, useMemo, useCallback } from "react";
import { useBetSlip } from "@/hooks/useBetSlip";
import { useSlipStore } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { calculatePotentialReturn, calculateTotalStake, getShieldFeeRate } from "@/lib/state/slipLogic";
import { PanelRight } from "lucide-react";
import { Button } from "@/components/ui";
import SlipTabs, { type SlipTabId } from "@/components/slip/SlipTabs";
import ToolbarRibbon from "@/components/slip/ToolbarRibbon";
import ManualTab from "@/components/slip/SlipVariantA";
import ComputeSlipTable from "@/components/slip/ComputeSlipTable";
import SavedSlipList from "@/components/slip/SavedSlipList";
import OrderPanel from "@/components/slip/OrderPanel";
import BottomBar from "@/components/slip/BottomBar";

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
  } = useBetSlip();

  const savedSlips = useSlipStore((s) => s.savedSlips);
  const loadSlip = useSlipStore((s) => s.loadSlip);
  const deleteSlip = useSlipStore((s) => s.deleteSlip);
  const saveSlip = useSlipStore((s) => s.saveSlip);
  const shareSlip = useSlipStore((s) => s.shareSlip);
  const currency = useSettingsStore((s) => s.currency);

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

  const savedSummary = useMemo(() => ({
    slipCount: savedSlips.length,
    selectionCount: savedSlips.reduce((acc, s) => acc + s.selections.length, 0),
  }), [savedSlips]);

  const totalCount = selections.length + computeSlips.reduce((acc, cs) => acc + cs.selections.length, 0);
  const hasContent = selections.length > 0 || computeSlips.length > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <SlipTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        badges={{
          manual: selections.length || undefined,
          compute: computeSlips.length || undefined,
          saved: savedSlips.length || undefined,
        }}
      />

      <ToolbarRibbon
        mode={mode}
        onModeChange={handleModeChange}
        bulkStake={bulkStake}
        onBulkStakeChange={setBulkStake}
        onApplyBulkStake={applyBulkStake}
        onShare={handleShare}
        onSave={handleSave}
        onClear={() => { clearSelections(); }}
        hasContent={activeTab === "manual" ? selections.length > 0 : hasContent}
        copied={copied}
      />

      {/* Save input row */}
      {showSaveInput && activeTab === "manual" && selections.length > 0 && (
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
        {/* Main content */}
        <div className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          {activeTab === "manual" && (
            <ManualTab
              stakes={stakes}
              onStakeChange={handleStakeChange}
              bulkStake={bulkStake}
              onBulkStakeChange={setBulkStake}
              onApplyBulkStake={applyBulkStake}
            />
          )}
          {activeTab === "compute" && (
            <ComputeSlipTable
              slips={computeSlips}
              currency={currency}
              onRemove={removeComputeSlip}
              onPlaceBets={placeBetsForGroup}
            />
          )}
          {activeTab === "saved" && (
            <SavedSlipList
              slips={savedSlips}
              onLoad={handleLoad}
              onDelete={deleteSlip}
            />
          )}

          {/* Right panel toggle when panel is closed (mobile/desktop) */}
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
          activeTab={activeTab}
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
          computeSummary={computeSummary}
          savedSummary={savedSummary}
          onStakeChange={setStakePerLeg}
          onStakeShieldToggle={() => setStakeShieldEnabled(!stakeShieldEnabled)}
          onPlaceBets={placeBets}
          onClear={clearSelections}
          isPlacing={isPlacing}
          placed={placed}
        />
      </div>

      {activeTab === "manual" && (
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
    </div>
  );
}
