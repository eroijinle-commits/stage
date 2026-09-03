import type {
  ArchitectSlip,
  PoolFixture,
  RuleSettings,
  StrategyConfig,
  StrategyName,
} from "./types";
import { applyRules } from "./rules";
import { estimatedWinRate, riskLevel } from "./probability";

export type StrategyGenerator = (pool: PoolFixture[], settings: RuleSettings) => ArchitectSlip[];

/**
 * Build an ArchitectSlip from a set of pool legs.
 */
export function createSlipFromLegs(
  legs: PoolFixture[],
  strategy: StrategyName,
  index: number,
): ArchitectSlip {
  const combinedOdds = legs.reduce((acc, l) => acc * l.odds, 1);
  const winRate = estimatedWinRate(legs);
  return {
    id: `${strategy}-${index}-${legs.map((l) => l.id).join("-")}`,
    strategy,
    legs,
    combinedOdds: Math.round(combinedOdds * 100) / 100,
    estimatedWinRate: Math.round(winRate * 1000) / 10,
    riskLevel: riskLevel(winRate),
  };
}

/**
 * Check whether a set of legs passes all hard rules.
 */
export function isValidSlip(legs: PoolFixture[], settings: RuleSettings): boolean {
  const results = applyRules(legs, settings);
  return results.filter((r) => r.severity === "hard").every((r) => r.passed);
}

/**
 * Run all four strategy generators and return the combined output.
 */
export function generateAll(
  pool: PoolFixture[],
  generators: StrategyGenerator[],
  settings: RuleSettings,
): ArchitectSlip[] {
  return generators.flatMap((gen) => gen(pool, settings));
}
