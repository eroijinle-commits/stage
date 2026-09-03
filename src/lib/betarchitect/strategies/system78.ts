import type { ArchitectSlip, PoolFixture, RuleSettings, StrategyConfig } from "../types";
import { createSlipFromLegs, isValidSlip } from "../generators";

export const SYSTEM78_CONFIG: StrategyConfig = {
  name: "System",
  legCount: 8,
  anchorCount: 2,
  coreCount: 4,
  valueCount: 2,
  maxSlips: 8,
  targetWinRate: [0.55, 0.7],
};

/**
 * System 7/8 generator: takes an 8-leg base slip and generates all valid
 * 7-leg combinations (C(8,7) = 8 combos, minus any that fail rules).
 *
 * If the pool is too small for 8 legs, falls back to building the best
 * available 8-leg slip first.
 */
export function generateSystem78(pool: PoolFixture[], settings: RuleSettings): ArchitectSlip[] {
  // Build the best 8-leg base slip
  const sorted = [...pool].sort((a, b) => b.impliedProbability - a.impliedProbability);
  const baseLegs: PoolFixture[] = [];

  for (const leg of sorted) {
    if (baseLegs.length >= SYSTEM78_CONFIG.legCount) break;
    const trial = [...baseLegs, leg];
    if (isValidSlip(trial, settings)) baseLegs.push(leg);
  }

  if (baseLegs.length < SYSTEM78_CONFIG.legCount) return [];

  // Generate all C(8,7) = 8 combinations by removing one leg at a time
  const slips: ArchitectSlip[] = [];
  const used = new Set<string>();

  for (let skip = 0; skip < baseLegs.length; skip++) {
    const legs = baseLegs.filter((_, idx) => idx !== skip);
    if (!isValidSlip(legs, settings)) continue;

    const key = legs
      .map((l) => l.id)
      .sort()
      .join(",");
    if (!used.has(key)) {
      used.add(key);
      slips.push(createSlipFromLegs(legs, "system", slips.length));
    }
  }

  return slips.slice(0, SYSTEM78_CONFIG.maxSlips);
}
