/**
 * useBetArchitect — main orchestrator hook for the BetArchitect feature.
 * Composes usePool, useRules, and useSlipGenerator into a single API
 * that BetArchitectPanel and BetArchitectPage consume.
 * @module hooks/useBetArchitect
 */

import { useCallback } from "react";
import { useSlipStore } from "@/store/useSlipStore";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { SlipMode } from "@/lib/contracts/db.contract";
import type { ArchitectSlip } from "@/lib/betarchitect/types";
import { usePool } from "./usePool";
import { useRules } from "./useRules";
import { useSlipGenerator } from "./useSlipGenerator";

export function useBetArchitect() {
  const { pool, addToPool, removeFromPool, clearPool } = usePool();
  const { effective, ...rulesUI } = useRules();
  const { slips, isGenerating, generate } = useSlipGenerator(pool, effective);
  const createSlip = useSlipStore((s) => s.createSlip);

  const addSlipToStore = useCallback(
    (slip: ArchitectSlip, mode: SlipMode = "parlay") => {
      const label = slip.strategy.charAt(0).toUpperCase() + slip.strategy.slice(1);
      const id = createSlip(label);
      const selections: BetSelection[] = slip.legs.map((leg) => ({
        ...leg,
        addedAt: Date.now(),
      }));
      useSlipStore.setState((st) => {
        const sameStrategy = st.slips.filter((s) => s.name.startsWith(label)).length;
        return {
          slips: st.slips.map((s) =>
            s.id === id
              ? {
                  ...s,
                  selections,
                  mode,
                  name: sameStrategy > 0 ? `${label} ${sameStrategy + 1}` : label,
                }
              : s,
          ),
          activeSlipId: id,
        };
      });
    },
    [createSlip],
  );

  const addAllSlipsToStore = useCallback(
    (targetSlips: ArchitectSlip[], mode: SlipMode = "parlay") => {
      targetSlips.forEach((slip) => addSlipToStore(slip, mode));
    },
    [addSlipToStore],
  );

  return {
    pool,
    addToPool,
    removeFromPool,
    clearPool,
    rules: rulesUI,
    effectiveSettings: effective,
    slips,
    isGenerating,
    generate,
    addSlipToStore,
    addAllSlipsToStore,
  };
}
