import type { StakeMarket } from "@/lib/contracts/api.contract";

/** Hard cap on total permutations */
export const MAX_PERMUTATIONS = 81;

/** Slip count options keyed by maxOutcomes */
export const SLIP_OPTIONS: Record<2 | 3, number[]> = {
  2: [16, 32, 64],
  3: [27, 81],
};

/**
 * How many markets are needed to produce `slipCount` permutations
 * when each market has `maxOutcomes` outcomes.
 */
export function marketsNeeded(slipCount: number, maxOutcomes: number): number {
  return Math.round(Math.log(slipCount) / Math.log(maxOutcomes));
}

/** A market with its computed highest active outcome odds */
export interface RankedMarket {
  market: StakeMarket;
  highestOdds: number;
  outcomeCount: number;
}

/** One permutation = one bet slip */
export interface ComputeSlip {
  id: string; // deterministic hash
  selections: ComputeSelection[];
  totalCombinedOdds: number; // product of all outcome odds
}

/** A single leg in a compute slip */
export interface ComputeSelection {
  marketId: string;
  marketName: string;
  outcomeId: string;
  outcomeName: string;
  odds: number;
}

/** Compute configuration — dropdown-driven values */
export interface ComputeConfig {
  maxOutcomes: 2 | 3; // max active outcomes per market
  slipCount: number; // number of slips to generate
}

/** Compute pipeline result */
export interface ComputeResult {
  fixtureName: string;
  fixtureSlug: string;
  selectedMarkets: RankedMarket[];
  totalPermutations: number;
  slips: ComputeSlip[];
}

/**
 * Estimate the total permutation count for a flat array of markets.
 * Returns the product of each market's outcomeCount.
 */
export function estimatePermutations(selectedMarkets: RankedMarket[]): number {
  let total = 1;
  for (const market of selectedMarkets) {
    total *= market.outcomeCount;
    if (total > MAX_PERMUTATIONS) return total; // early exit
  }
  return total;
}
