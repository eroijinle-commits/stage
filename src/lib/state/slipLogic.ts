/**
 * Pure functions for bet slip calculations and validation.
 * No side effects — safe to call from selectors, hooks, or tests.
 * @module lib/state/slipLogic
 */

import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { SlipMode } from "@/lib/contracts/db.contract";

// ─── Calculation ────────────────────────────────────────────────────────────

/**
 * Calculate the potential return for the entire slip.
 * Singles: Σ(stake × odds) for each selection.
 * Parlay: stake × Π(odds) for all selections.
 */
export function calculatePotentialReturn(
    selections: BetSelection[],
    mode: SlipMode,
    stakePerLeg: number,
    perLegStakes?: Record<string, number>,
): number {
    if (selections.length === 0) return 0;

    if (mode === "parlay") {
        const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
        return Math.round(stakePerLeg * combinedOdds * 100) / 100;
    }

    // Singles
    return selections.reduce((acc, s) => {
        const stake = perLegStakes?.[s.id] ?? stakePerLeg;
        return acc + stake * s.odds;
    }, 0);
}

/**
 * Calculate the total stake required.
 * Singles: Σ stake per leg.
 * Parlay: single stake amount.
 */
export function calculateTotalStake(
    selections: BetSelection[],
    mode: SlipMode,
    stakePerLeg: number,
    perLegStakes?: Record<string, number>,
): number {
    if (selections.length === 0) return 0;

    if (mode === "parlay") {
        return stakePerLeg;
    }

    return selections.reduce((acc, s) => {
        const stake = perLegStakes?.[s.id] ?? stakePerLeg;
        return acc + stake;
    }, 0);
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validate the slip. Returns an array of human-readable error messages.
 * Empty array means the slip is valid.
 */
export function validateSlip(
    selections: BetSelection[],
    balance: number | null,
    totalStake: number,
): string[] {
    const errors: string[] = [];

    if (selections.length === 0) {
        errors.push("No selections in the slip.");
        return errors;
    }

    // Check stake > 0
    if (totalStake <= 0) {
        errors.push("Total stake must be greater than zero.");
    }

    // Check balance
    if (balance !== null && totalStake > balance) {
        errors.push(
            `Insufficient balance. You have ${balance.toLocaleString()} but need ${totalStake.toLocaleString()}.`,
        );
    }

    // Check for suspended / inactive selections
    const inactive = selections.filter((s) => !s.active);
    if (inactive.length > 0) {
        errors.push(
            `${inactive.length} selection(s) are no longer available: ${inactive.map((s) => s.outcomeName).join(", ")}`,
        );
    }

    // Check for duplicate outcomes
    const outcomeIds = selections.map((s) => s.outcomeId);
    const uniqueIds = new Set(outcomeIds);
    if (uniqueIds.size !== outcomeIds.length) {
        errors.push("Duplicate selections detected. Remove duplicates before placing bets.");
    }

    // Check for odds changes (odds <= 0 is invalid)
    const badOdds = selections.filter((s) => s.odds <= 0);
    if (badOdds.length > 0) {
        errors.push(
            `${badOdds.length} selection(s) have invalid odds.`,
        );
    }

    return errors;
}

/**
 * Check if a bet can be placed.
 */
export function canPlaceBet(
    selections: BetSelection[],
    balance: number | null,
    totalStake: number,
): boolean {
    return validateSlip(selections, balance, totalStake).length === 0;
}
