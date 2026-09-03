import type { RiskLevel } from "./types";

/**
 * Convert decimal odds to implied probability (1 / odds).
 */
export function impliedProbability(odds: number): number {
  return 1 / odds;
}

/**
 * Estimate joint win rate from a set of legs using naive independent product.
 * Clamped to [0.05, 0.95] for display purposes.
 */
export function estimatedWinRate(legs: { odds: number }[]): number {
  const product = legs.reduce((acc, l) => acc * impliedProbability(l.odds), 1);
  return Math.min(0.95, Math.max(0.05, product));
}

/**
 * Map a win rate to a human-readable risk level.
 */
export function riskLevel(winRate: number): RiskLevel {
  if (winRate >= 0.75) return "low";
  if (winRate >= 0.6) return "medium";
  if (winRate >= 0.45) return "high";
  return "extreme";
}
