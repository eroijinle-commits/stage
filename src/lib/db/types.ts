// Re-export contract types for convenience
export type {
  BetRecord,
  BetOutcomeRecord,
  SavedFilter,
  StakingPreset,
  AppSetting,
  BetStatus,
  BetType,
  StakingMode,
} from "../contracts/db.contract";

// Drizzle inferred table types
export type Bet = typeof import("./schema").bets.$inferSelect;
export type NewBet = typeof import("./schema").bets.$inferInsert;
export type BetOutcome = typeof import("./schema").betOutcomes.$inferSelect;
export type NewBetOutcome = typeof import("./schema").betOutcomes.$inferInsert;
export type SavedFilterRow = typeof import("./schema").savedFilters.$inferSelect;
export type NewSavedFilter = typeof import("./schema").savedFilters.$inferInsert;
export type StakingPresetRow = typeof import("./schema").stakingPresets.$inferSelect;
export type NewStakingPreset = typeof import("./schema").stakingPresets.$inferInsert;
export type SettingRow = typeof import("./schema").settings.$inferSelect;
export type AppStateRow = typeof import("./schema").appState.$inferSelect;
