export type BetStatus = "pending" | "won" | "lost" | "cancelled" | "cashout" | "settled" | "voided";
export type BetType = "single" | "parlay";
export type SlipMode = "singles" | "parlay";
export type OddsFormat = "decimal" | "fractional" | "american";
export type StakingMode = "flat" | "percentage" | "kelly" | "unit";
export interface BetRecord {
  id: string;
  amount: number;
  currency: string;
  status: BetStatus;
  betType: BetType;
  payoutMultiplier: number | null;
  potentialMultiplier: number;
  totalOdds: number;
  stakePerLeg: number | null;
  createdAt: number;
  settledAt: number | null;
  rawData: string;
}
export interface BetOutcomeRecord {
  id: string;
  betId: string;
  outcomeId: string;
  odds: number;
  name: string;
  marketName: string;
  fixtureName: string;
  fixtureSlug: string;
  status: BetStatus;
  result: string | null;
}
export interface SavedFilter {
  id: number;
  name: string;
  sport: string | null;
  group: string | null;
  tournamentSlugs: string[];
  dateFrom: number | null;
  dateTo: number | null;
  marketTemplate: string | null;
  createdAt: number;
}
export interface StakingPreset {
  id: number;
  name: string;
  mode: StakingMode;
  amount: number | null;
  percentage: number | null;
  unitSize: number | null;
  bankroll: number | null;
  isDefault: boolean;
}
export interface AppSetting {
  key: string;
  value: string;
  updatedAt: number;
}
