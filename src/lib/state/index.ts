// Barrel export for the state management layer
export {
  calculatePotentialReturn,
  calculateTotalStake,
  validateSlip,
  canPlaceBet,
} from "./slipLogic";

export { executeBetPlacement } from "./betPlacement";
export type { BetPlacementParams, BetPlacementResult } from "./betPlacement";
