/**
 * Shared types for the Value Scanner feature.
 * @module lib/scanner/types
 */

import type { StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";

/** A market flagged by the scanner for exceeding the odds-gap threshold. */
export interface FlaggedMarket {
  market: StakeMarket;
  gapRatio: number;
  minOdds: number;
  maxOdds: number;
  minOutcome: StakeMarketOutcome;
  maxOutcome: StakeMarketOutcome;
}
