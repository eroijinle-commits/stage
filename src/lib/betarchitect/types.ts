import type { BetSelection } from "@/lib/contracts/ui.contract";

// ─── Pool ─────────────────────────────────────────────────────────────────

/**
 * A fixture selected for the BetArchitect pool.
 * Extends BetSelection so pool legs can be converted directly to
 * slip selections without field mapping.
 *
 * Convenience aliases:
 *  - `matchId` → `fixtureId`
 *  - `league`  → `tournamentName`
 *  - `market`  → `marketName`
 *  - `selection` → `outcomeName`
 */
export interface PoolFixture extends BetSelection {
  /** Same as fixtureId — human-readable alias for generators/UI */
  matchId: string;
  /** Sport slug (e.g. "soccer", "tennis"). Falls back to parent's optional `sport`. */
  sport: string;
  /** League / tournament name — alias for tournamentName */
  league: string;
  /** Human-readable market label (e.g. "Over/Under 2.5 Goals") — alias for marketName */
  market: string;
  /** Human-readable selection label (e.g. "Over 2.5") — alias for outcomeName */
  selection: string;
  /** Implied probability derived from odds (1 / odds) */
  impliedProbability: number;
  /** All available outcomes for this market, used for rich slip display */
  allOutcomes?: Array<{ name: string; odds: number; active: boolean }>;
  /** Where this pool leg came from — affects display and future rules */
  source?: "discovery" | "value-scanner";
  /** Odds gap ratio that flagged this leg in the Value Scanner (scanner-sourced only) */
  gapRatio?: number;
  /** Min odds across the flagged market at scan time (scanner-sourced only) */
  gapMinOdds?: number;
  /** Max odds across the flagged market at scan time (scanner-sourced only) */
  gapMaxOdds?: number;
}

// ─── Generated Slip ───────────────────────────────────────────────────────

export type StrategyName = "fortress" | "growth" | "upside" | "system";
export type RiskLevel = "low" | "medium" | "high" | "extreme";

export interface ArchitectSlip {
  id: string;
  strategy: StrategyName;
  legs: PoolFixture[];
  combinedOdds: number;
  estimatedWinRate: number;
  riskLevel: RiskLevel;
}

// ─── Strategy Configuration ───────────────────────────────────────────────

export interface StrategyConfig {
  name: string;
  legCount: number;
  anchorCount: number;
  coreCount: number;
  valueCount: number;
  maxSlips: number;
  /** [min, max] target win-rate range for the strategy */
  targetWinRate: [number, number];
}

// ─── Rules Engine ─────────────────────────────────────────────────────────

export type RuleSeverity = "hard" | "soft" | "info";

export interface RuleResult {
  rule: string;
  passed: boolean;
  severity: RuleSeverity;
  message: string;
}

export interface RuleSettings {
  /** Minimum odds per individual leg */
  minLegOdds: number;
  /** Maximum combined (parlay) odds per slip */
  maxCombinedOdds: number;
  /** Maximum legs from the same sport per slip */
  maxSameSport: number;
  /** Maximum legs from the same league per slip */
  maxSameLeague: number;
}
