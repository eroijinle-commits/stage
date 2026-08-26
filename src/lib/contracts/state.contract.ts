import { BetSelection } from "./ui.contract";
import { SlipMode } from "./db.contract";

export interface DiscoveryState { sport: string; group: string; dateFrom: number | null; dateTo: number | null; tournamentSlugs: string[]; marketTemplate: string | null; searchQuery: string; isLoading: boolean; error: string | null; fixtures: unknown[]; }
export interface SlipState { selections: BetSelection[]; mode: SlipMode; stakePerLeg: number; totalStake: number; isPlacing: boolean; placeResults: Array<{ selectionId: string; success: boolean; betId?: string; error?: string; placedAt: number }>; lastError: string | null; }
export interface SettingsState { apiToken: string | null; currency: string; oddsFormat: "decimal" | "fractional" | "american"; defaultPresetId: number | null; notifications: { betPlaced: boolean; betSettled: boolean; oddsChanged: boolean }; theme: "dark" | "light" | "system"; }
export interface UIState { slipOpen: boolean; commandPaletteOpen: boolean; activeModal: string | null; modalData: unknown; toasts: Array<{ id: string; type: "success" | "error" | "warning" | "info"; title: string; description?: string }>; sidebarCollapsed: boolean; isMobile: boolean; }
export interface AppState { discovery: DiscoveryState; slip: SlipState; settings: SettingsState; ui: UIState; }
