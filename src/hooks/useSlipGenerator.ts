/**
 * useSlipGenerator — runs the four BetArchitect strategy generators against
 * the current pool and rule settings. Reads/writes generated slips from the
 * persisted Zustand store so they survive page refreshes.
 * @module hooks/useSlipGenerator
 */

import { useState, useCallback } from "react";
import type { PoolFixture, RuleSettings } from "@/lib/betarchitect/types";
import { generateFortress } from "@/lib/betarchitect/strategies/fortress";
import { generateGrowth } from "@/lib/betarchitect/strategies/growth";
import { generateUpside } from "@/lib/betarchitect/strategies/upside";
import { generateSystem78 } from "@/lib/betarchitect/strategies/system78";
import { useSlipStore } from "@/store/useSlipStore";

export function useSlipGenerator(pool: PoolFixture[], settings: RuleSettings) {
  const slips = useSlipStore((s) => s.architectSlips);
  const setArchitectSlips = useSlipStore((s) => s.setArchitectSlips);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(() => {
    // Filter out pool fixtures with empty outcome IDs before generating.
    // The Stake API rejects non-UUID outcome IDs, causing silent bet failures.
    const validPool = pool.filter((f) => f.outcomeId && f.outcomeId.trim() !== "");
    if (validPool.length === 0) {
      setArchitectSlips([]);
      return;
    }
    setIsGenerating(true);
    const results = [
      ...generateFortress(validPool, settings),
      ...generateGrowth(validPool, settings),
      ...generateUpside(validPool, settings),
      ...generateSystem78(validPool, settings),
    ];
    setArchitectSlips(results);
    setIsGenerating(false);
  }, [pool, settings, setArchitectSlips]);

  return { slips, isGenerating, generate };
}
