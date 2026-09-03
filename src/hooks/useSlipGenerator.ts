/**
 * useSlipGenerator — runs the four BetArchitect strategy generators against
 * the current pool and rule settings. Returns generated slips and a generate()
 * trigger.
 * @module hooks/useSlipGenerator
 */

import { useState, useCallback } from "react";
import type { ArchitectSlip, PoolFixture, RuleSettings } from "@/lib/betarchitect/types";
import { generateFortress } from "@/lib/betarchitect/strategies/fortress";
import { generateGrowth } from "@/lib/betarchitect/strategies/growth";
import { generateUpside } from "@/lib/betarchitect/strategies/upside";
import { generateSystem78 } from "@/lib/betarchitect/strategies/system78";

export function useSlipGenerator(pool: PoolFixture[], settings: RuleSettings) {
  const [slips, setSlips] = useState<ArchitectSlip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(() => {
    if (pool.length === 0) {
      setSlips([]);
      return;
    }
    setIsGenerating(true);
    const results: ArchitectSlip[] = [
      ...generateFortress(pool, settings),
      ...generateGrowth(pool, settings),
      ...generateUpside(pool, settings),
      ...generateSystem78(pool, settings),
    ];
    setSlips(results);
    setIsGenerating(false);
  }, [pool, settings]);

  return { slips, isGenerating, generate };
}
