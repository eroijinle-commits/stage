// Barrel export for the database layer
export { getDb, checkConnection } from "./client";
export * from "./schema";
export type {
  Bet,
  NewBet,
  BetOutcome,
  NewBetOutcome,
  SavedFilterRow,
  NewSavedFilter,
  StakingPresetRow,
  NewStakingPreset,
  SettingRow,
  AppStateRow,
} from "./types";

// Repositories
export * as betRepo from "./repositories/bet.repository";
export * as outcomeRepo from "./repositories/outcome.repository";
export * as filterRepo from "./repositories/filter.repository";
export * as presetRepo from "./repositories/preset.repository";
export * as settingsRepo from "./repositories/settings.repository";
