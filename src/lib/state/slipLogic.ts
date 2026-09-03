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
/**
 * Get the Stake Shield insurance fee rate based on number of legs.
 * More legs = higher fee because the shield covers more combinations.
 * Fee reduces the potential payout (you pay for the insurance).
 */
export function getShieldFeeRate(legCount: number): number {
  if (legCount <= 3) return 0.1;
  if (legCount <= 4) return 0.15;
  return 0.2; // 5+ legs
}

export function calculatePotentialReturn(
  selections: BetSelection[],
  mode: SlipMode,
  stakePerLeg: number,
  perLegStakes?: Record<string, number>,
  stakeShieldEnabled?: boolean,
): number {
  if (selections.length === 0) return 0;

  if (mode === "parlay") {
    const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);
    let return_ = stakePerLeg * combinedOdds;

    // Stake Shield reduces potential payout — you pay an insurance fee
    if (stakeShieldEnabled && selections.length >= 3) {
      const feeRate = getShieldFeeRate(selections.length);
      return_ *= 1 - feeRate;
    }

    return Math.round(return_ * 100) / 100;
  }

  // Singles — shield is parlay-only, no adjustment
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
  mode: SlipMode = "singles",
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

  // Check for duplicate outcomes — ignore empty/placeholder IDs
  const validSelections = selections.filter((s) => s.outcomeId && s.outcomeId.trim() !== "");
  const outcomeIds = validSelections.map((s) => s.outcomeId);
  const uniqueIds = new Set(outcomeIds);
  if (uniqueIds.size !== outcomeIds.length) {
    // Identify which specific selections are duplicates
    const seen = new Map<string, BetSelection[]>();
    for (const sel of validSelections) {
      const existing = seen.get(sel.outcomeId) ?? [];
      existing.push(sel);
      seen.set(sel.outcomeId, existing);
    }

    const duplicateGroups = Array.from(seen.entries())
      .filter(([, group]) => group.length > 1);

    const duplicateDescriptions = duplicateGroups.map(([outcomeId, group]) => {
      const names = group.map((s) => `${s.outcomeName} (${s.fixtureName})`);
      return `ID "${outcomeId.slice(0, 12)}...": ${names.join(" vs ")}`;
    });

    errors.push(
      `Duplicate selections detected:\n${duplicateDescriptions.join("\n")}\nRemove duplicates before placing bets.`,
    );
  }

  // Parlays cannot combine outcomes from the same fixture
  if (mode === "parlay") {
    const fixtureIds = selections.map((s) => s.fixtureId);
    const uniqueFixtures = new Set(fixtureIds);
    if (uniqueFixtures.size !== fixtureIds.length) {
      errors.push(
        "Parlays cannot combine selections from the same match. Switch to Singles mode or remove duplicate matches.",
      );
    }
  }

  // Check for odds changes (odds <= 0 is invalid)
  const badOdds = selections.filter((s) => s.odds <= 0);
  if (badOdds.length > 0) {
    errors.push(`${badOdds.length} selection(s) have invalid odds.`);
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
  mode: SlipMode = "singles",
): boolean {
  return validateSlip(selections, balance, totalStake, mode).length === 0;
}
