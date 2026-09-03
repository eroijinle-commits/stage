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
    if (pool.length === 0) {
      setArchitectSlips([]);
      return;
    }
    setIsGenerating(true);
    const results = [
      ...generateFortress(pool, settings),
      ...generateGrowth(pool, settings),
      ...generateUpside(pool, settings),
      ...generateSystem78(pool, settings),
    ];
    setArchitectSlips(results);
    setIsGenerating(false);
  }, [pool, settings, setArchitectSlips]);

  return { slips, isGenerating, generate };
}
