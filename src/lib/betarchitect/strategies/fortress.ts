import type { ArchitectSlip, PoolFixture, RuleSettings, StrategyConfig } from "../types";
import { createSlipFromLegs, isValidSlip } from "../generators";

export const FORTRESS_CONFIG: StrategyConfig = {
  name: "Fortress",
  legCount: 4,
  anchorCount: 4,
  coreCount: 0,
  valueCount: 0,
  maxSlips: 6,
  targetWinRate: [0.75, 0.85],
};

/**
 * Fortress generator: 4 ultra-safe legs, sorted by highest implied probability.
 * Greedy approach — pick the safest valid combos by iterating candidate anchors.
 */
export function generateFortress(pool: PoolFixture[], settings: RuleSettings): ArchitectSlip[] {
  const candidates = [...pool].sort((a, b) => b.impliedProbability - a.impliedProbability);
  const slips: ArchitectSlip[] = [];
  const used = new Set<string>();

  for (let i = 0; i < candidates.length && slips.length < FORTRESS_CONFIG.maxSlips; i++) {
    const legs: PoolFixture[] = [candidates[i]];

    for (const leg of candidates) {
      if (legs.length >= FORTRESS_CONFIG.legCount) break;
      if (legs.some((l) => l.id === leg.id)) continue;
      const trial = [...legs, leg];
      if (isValidSlip(trial, settings)) legs.push(leg);
    }

    if (legs.length === FORTRESS_CONFIG.legCount && isValidSlip(legs, settings)) {
      const key = legs
        .map((l) => l.id)
        .sort()
        .join(",");
      if (!used.has(key)) {
        used.add(key);
        slips.push(createSlipFromLegs(legs, "fortress", slips.length));
      }
    }
  }

  return slips.slice(0, FORTRESS_CONFIG.maxSlips);
}
