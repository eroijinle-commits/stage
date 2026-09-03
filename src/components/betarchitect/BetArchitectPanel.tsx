import { useBetArchitect } from "@/hooks/useBetArchitect";
import { useSlipStore } from "@/store/useSlipStore";
import PoolBuilder from "./PoolBuilder";
import RulesEngine from "./RulesEngine";
import StrategyTabs from "./StrategyTabs";

export default function BetArchitectPanel() {
  const ba = useBetArchitect();
  const clearArchitectSlips = useSlipStore((s) => s.clearArchitectSlips);
  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-mono font-bold text-foreground">BetArchitect</h2>
        <p className="text-[10px] font-mono text-muted-foreground">Intelligent slip aggregation</p>
      </div>
      <PoolBuilder pool={ba.pool} onRemove={ba.removeFromPool} onClear={ba.clearPool} />
      <RulesEngine
        expertMode={ba.rules.expertMode}
        onToggleExpertMode={ba.rules.setExpertMode}
        onOverride={ba.rules.setOverrides}
      />
      <StrategyTabs
        slips={ba.slips}
        isGenerating={ba.isGenerating}
        onGenerate={ba.generate}
        onAddToSlip={ba.addSlipToStore}
        onClearAll={clearArchitectSlips}
        poolSize={ba.pool.length}
      />
    </div>
  );
}
