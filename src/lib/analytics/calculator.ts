import type { BetRecord } from "@/lib/contracts/db.contract";

/**
 * Calculate ROI (Return on Investment) as a percentage.
 */
export function calculateROI(totalProfit: number, totalWagered: number): number {
  if (totalWagered === 0) return 0;
  return (totalProfit / totalWagered) * 100;
}

/**
 * Calculate Yield (profit per unit wagered) as a percentage.
 * Identical to ROI in most betting contexts; kept separate for clarity.
 */
export function calculateYield(totalProfit: number, totalWagered: number): number {
  if (totalWagered === 0) return 0;
  return (totalProfit / totalWagered) * 100;
}

/**
 * Calculate win rate as a percentage (0-100).
 */
export function calculateWinRate(wins: number, totalBets: number): number {
  if (totalBets === 0) return 0;
  return (wins / totalBets) * 100;
}

/**
 * Calculate average odds from an array of decimal odds values.
 */
export function calculateAvgOdds(odds: number[]): number {
  if (odds.length === 0) return 0;
  return odds.reduce((sum, o) => sum + o, 0) / odds.length;
}

/**
 * Calculate profit per bet (average profit).
 */
export function calculateProfitPerBet(totalProfit: number, totalBets: number): number {
  if (totalBets === 0) return 0;
  return totalProfit / totalBets;
}

/**
 * Calculate Kelly Criterion stake size.
 *
 * @param probability - estimated probability of winning (0-1)
 * @param odds - decimal odds offered
 * @param bankroll - current bankroll
 * @param fraction - fraction of full Kelly to use (e.g., 0.25 for quarter-Kelly)
 * @returns recommended stake amount (floored to 2 decimals)
 */
export function calculateKellyCriterion(
  probability: number,
  odds: number,
  bankroll: number,
  fraction = 0.25,
): number {
  if (probability <= 0 || odds <= 1 || bankroll <= 0) return 0;

  // Full Kelly: f = (p * (odds - 1) - (1 - p)) / (odds - 1)
  const b = odds - 1;
  const fullKelly = (probability * b - (1 - probability)) / b;

  // Fractional Kelly (never go negative)
  const stake = Math.max(0, fullKelly * fraction * bankroll);
  return Math.floor(stake * 100) / 100;
}

/**
 * Calculate expected value of a bet.
 *
 * @param probability - estimated probability of winning (0-1)
 * @param odds - decimal odds
 * @returns expected value per unit staked
 */
export function calculateExpectedValue(probability: number, odds: number): number {
  return probability * (odds - 1) - (1 - probability);
}

/**
 * Calculate current winning/losing streak, best winning streak, and worst losing streak.
 */
export function calculateStreaks(bets: BetRecord[]): {
  currentStreak: number;
  bestStreak: number;
  worstStreak: number;
} {
  const settled = bets
    .filter((b) => b.status === "won" || b.status === "lost")
    .sort((a, b) => a.createdAt - b.createdAt);

  if (settled.length === 0) {
    return { currentStreak: 0, bestStreak: 0, worstStreak: 0 };
  }

  let currentStreak = 0;
  let bestStreak = 0;
  let worstStreak = 0;
  let streakType: "won" | "lost" | null = null;
  let streakLen = 0;

  for (const bet of settled) {
    if (bet.status === streakType) {
      streakLen++;
    } else {
      streakType = bet.status as "won" | "lost";
      streakLen = 1;
    }

    if (streakType === "won" && streakLen > bestStreak) bestStreak = streakLen;
    if (streakType === "lost" && streakLen > worstStreak) worstStreak = streakLen;
  }

  // Current streak = final streak from end of array
  currentStreak = streakType === "won" ? streakLen : -streakLen;

  return { currentStreak, bestStreak, worstStreak };
}

/**
 * Calculate annualized Sharpe ratio from a series of returns.
 *
 * @param returns - array of daily/periodic returns (as decimals, e.g. 0.01 for 1%)
 * @param riskFreeRate - annualized risk-free rate (default 0)
 * @returns Sharpe ratio (annualized assuming daily periods)
 */
export function calculateSharpeRatio(returns: number[], riskFreeRate = 0): number {
  if (returns.length < 2) return 0;

  const n = returns.length;
  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  const excessReturn = mean - riskFreeRate / 252;
  // Annualize: multiply by sqrt(252) trading days
  return (excessReturn / stdDev) * Math.sqrt(252);
}
