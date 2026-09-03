import type { ArchitectSlip, PoolFixture, RuleSettings, StrategyConfig } from "../types";
import { createSlipFromLegs, isValidSlip } from "../generators";

export const UPSIDE_CONFIG: StrategyConfig = {
  name: "Upside",
  legCount: 9,
  anchorCount: 1,
  coreCount: 2,
  valueCount: 6,
  maxSlips: 3,
  targetWinRate: [0.45, 0.6],
};

/**
 * Upside generator: 8-10 legs, value-heavy.
 * Prioritizes lower-probability (higher odds) legs for maximum upside.
 */
export function generateUpside(pool: PoolFixture[], settings: RuleSettings): ArchitectSlip[] {
  if (pool.length < 8) return [];

  // Sort by lowest implied probability (highest odds = most value)
  const sorted = [...pool].sort((a, b) => a.impliedProbability - b.impliedProbability);

  const slips: ArchitectSlip[] = [];
  const used = new Set<string>();

  for (let i = 0; i < sorted.length && slips.length < UPSIDE_CONFIG.maxSlips; i++) {
    const legs: PoolFixture[] = [sorted[i]];

    for (const leg of sorted) {
      if (legs.length >= UPSIDE_CONFIG.legCount) break;
      if (legs.some((l) => l.id === leg.id)) continue;
      const trial = [...legs, leg];
      if (isValidSlip(trial, settings)) legs.push(leg);
    }

    if (legs.length >= 8 && legs.length <= 10 && isValidSlip(legs, settings)) {
      const key = legs
        .map((l) => l.id)
        .sort()
        .join(",");
      if (!used.has(key)) {
        used.add(key);
        slips.push(createSlipFromLegs(legs, "upside", slips.length));
      }
    }
  }

  return slips.slice(0, UPSIDE_CONFIG.maxSlips);
}
