import type { ArchitectSlip, PoolFixture, RuleSettings, StrategyConfig } from "../types";
import { createSlipFromLegs, isValidSlip } from "../generators";

export const GROWTH_CONFIG: StrategyConfig = {
  name: "Growth",
  legCount: 7,
  anchorCount: 2,
  coreCount: 3,
  valueCount: 2,
  maxSlips: 4,
  targetWinRate: [0.6, 0.75],
};

/**
 * Growth generator: 6-8 legs with a balanced mix of safe and value picks.
 * Sorts by implied probability, then greedily builds slips mixing anchors
 * (high probability) with value (lower probability) legs.
 */
export function generateGrowth(pool: PoolFixture[], settings: RuleSettings): ArchitectSlip[] {
  if (pool.length < GROWTH_CONFIG.legCount) return [];

  // Split pool into safe (top 60% by probability) and value (bottom 40%)
  const sorted = [...pool].sort((a, b) => b.impliedProbability - a.impliedProbability);
  const splitIdx = Math.max(1, Math.floor(sorted.length * 0.6));
  const safe = sorted.slice(0, splitIdx);
  const value = sorted.slice(splitIdx);

  const slips: ArchitectSlip[] = [];
  const used = new Set<string>();

  for (let i = 0; i < safe.length && slips.length < GROWTH_CONFIG.maxSlips; i++) {
    const legs: PoolFixture[] = [safe[i]];

    // Add remaining safe legs
    for (const leg of safe) {
      if (legs.length >= GROWTH_CONFIG.legCount) break;
      if (legs.some((l) => l.id === leg.id)) continue;
      const trial = [...legs, leg];
      if (isValidSlip(trial, settings)) legs.push(leg);
    }

    // Fill remaining slots with value legs
    for (const leg of value) {
      if (legs.length >= GROWTH_CONFIG.legCount) break;
      if (legs.some((l) => l.id === leg.id)) continue;
      const trial = [...legs, leg];
      if (isValidSlip(trial, settings)) legs.push(leg);
    }

    if (legs.length >= 6 && legs.length <= 8 && isValidSlip(legs, settings)) {
      const key = legs
        .map((l) => l.id)
        .sort()
        .join(",");
      if (!used.has(key)) {
        used.add(key);
        slips.push(createSlipFromLegs(legs, "growth", slips.length));
      }
    }
  }

  return slips.slice(0, GROWTH_CONFIG.maxSlips);
}
