/**
 * Async bet placement engine.
 * Validates, calls the Stake API, persists to Neon DB, and returns results.
 * @module lib/state/betPlacement
 */

import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { SlipMode } from "@/lib/contracts/db.contract";
import { placeBetMutation } from "@/lib/stake-api/mutations";
import { StakeApiError } from "@/lib/stake-api/types";
import { getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { createBet } from "@/lib/db/repositories/bet.repository";
import { createOutcome } from "@/lib/db/repositories/outcome.repository";
import { validateSlip } from "./slipLogic";

export interface BetPlacementParams {
  selections: BetSelection[];
  mode: SlipMode;
  stakePerLeg: number;
  currency: string;
  balance: number | null;
  oddsChange?: "any" | "better" | "none";
  stakeShieldEnabled?: boolean;
}

export interface BetPlacementResult {
  selectionId: string;
  success: boolean;
  betId?: string;
  error?: string;
  placedAt: number;
}

/**
 * Execute bet placement.
 * 1. Validate slip
 * 2. For parlay: single API call with all outcomeIds
 * 3. For singles: sequential API calls (one per selection)
 * 4. Persist each successful bet to the Neon DB
 * 5. Return per-selection results
 */
export async function executeBetPlacement(
  params: BetPlacementParams,
): Promise<BetPlacementResult[]> {
  const { selections, mode, stakePerLeg, currency, balance, stakeShieldEnabled } = params;

  // Validate
  const totalStake =
    mode === "parlay" ? stakePerLeg : selections.reduce((acc, s) => acc + stakePerLeg, 0);

  const errors = validateSlip(selections, balance, totalStake, mode);
  if (errors.length > 0) {
    return selections.map((s) => ({
      selectionId: s.id,
      success: false,
      error: errors[0],
      placedAt: Date.now(),
    }));
  }

  // Pre-flight: validate outcome IDs are present and non-empty
  const emptyOutcomeIds = selections.filter((s) => !s.outcomeId || s.outcomeId.trim() === "");
  if (emptyOutcomeIds.length > 0) {
    return selections.map((s) => ({
      selectionId: s.id,
      success: false,
      error: `Selection "${s.outcomeName}" has no valid outcome ID. Re-add it from the Discovery page.`,
      placedAt: Date.now(),
    }));
  }

  const results: BetPlacementResult[] = [];

  if (mode === "parlay") {
    // Single API call for parlay
    const outcomeIds = selections.map((s) => s.outcomeId);
    const amounts = selections.map(() => stakePerLeg / selections.length);
    const odds = selections.map((s) => s.odds);

    try {
      const apiResult = await placeBetMutation({
        outcomeIds,
        amounts,
        currency,
        odds,
        betType: "multi",
        stakeShieldEnabled,
      });

      // Persist to DB
      await persistBetToDb(apiResult.id, {
        amount: stakePerLeg,
        currency,
        status: apiResult.status || "pending",
        betType: "parlay",
        payoutMultiplier: apiResult.potentialMultiplier,
        potentialMultiplier: apiResult.potentialMultiplier,
        totalOdds: selections.reduce((acc, s) => acc * s.odds, 1),
        stakePerLeg,
        outcomes: selections.map((s, i) => ({
          outcomeId: s.outcomeId,
          odds: s.odds,
          name: s.outcomeName,
          marketName: s.marketName,
          fixtureName: s.fixtureName,
          fixtureSlug: s.fixtureSlug,
        })),
        rawData: JSON.stringify(apiResult),
      });

      const placedAt = Date.now();
      for (const sel of selections) {
        results.push({
          selectionId: sel.id,
          success: true,
          betId: apiResult.id,
          placedAt,
        });
      }
    } catch (err) {
      const message = err instanceof StakeApiError
        ? getUserFriendlyMessage(err.type)
        : err instanceof Error ? err.message : "Bet placement failed";
      const placedAt = Date.now();
      for (const sel of selections) {
        results.push({
          selectionId: sel.id,
          success: false,
          error: message,
          placedAt,
        });
      }
    }
  } else {
    // Singles — place each selection sequentially
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      try {
        const apiResult = await placeBetMutation({
          outcomeIds: [sel.outcomeId],
          amounts: [stakePerLeg],
          currency,
          odds: [sel.odds],
          betType: "sports",
          // Stake Shield is parlay-only; singles never use it
        });

        // Persist to DB
        await persistBetToDb(apiResult.id, {
          amount: stakePerLeg,
          currency,
          status: apiResult.status || "pending",
          betType: "single",
          payoutMultiplier: apiResult.potentialMultiplier,
          potentialMultiplier: apiResult.potentialMultiplier,
          totalOdds: sel.odds,
          stakePerLeg,
          outcomes: [
            {
              outcomeId: sel.outcomeId,
              odds: sel.odds,
              name: sel.outcomeName,
              marketName: sel.marketName,
              fixtureName: sel.fixtureName,
              fixtureSlug: sel.fixtureSlug,
            },
          ],
          rawData: JSON.stringify(apiResult),
        });

        results.push({
          selectionId: sel.id,
          success: true,
          betId: apiResult.id,
          placedAt: Date.now(),
        });
      } catch (err) {
        // Singles: continue placing the rest even if one fails
        const message = err instanceof StakeApiError
          ? getUserFriendlyMessage(err.type)
          : err instanceof Error ? err.message : "Bet placement failed";
        results.push({
          selectionId: sel.id,
          success: false,
          error: message,
          placedAt: Date.now(),
        });
      }
    }
  }

  return results;
}

// ─── DB Persistence ─────────────────────────────────────────────────────────

interface PersistBetParams {
  amount: number;
  currency: string;
  status: string;
  betType: string;
  payoutMultiplier: number | null;
  potentialMultiplier: number;
  totalOdds: number;
  stakePerLeg: number;
  outcomes: Array<{
    outcomeId: string;
    odds: number;
    name: string;
    marketName: string;
    fixtureName: string;
    fixtureSlug: string;
  }>;
  rawData: string;
}

async function persistBetToDb(betId: string, params: PersistBetParams): Promise<void> {
  try {
    await createBet({
      id: betId,
      amount: params.amount,
      currency: params.currency,
      status: params.status,
      betType: params.betType,
      payoutMultiplier: params.payoutMultiplier,
      potentialMultiplier: params.potentialMultiplier,
      totalOdds: params.totalOdds,
      stakePerLeg: params.stakePerLeg,
      createdAt: Math.floor(Date.now() / 1000),
      settledAt: null,
      rawData: params.rawData,
    });

    // Persist each outcome
    for (let i = 0; i < params.outcomes.length; i++) {
      const o = params.outcomes[i];
      await createOutcome({
        id: `${betId}-o${i}`,
        betId,
        outcomeId: o.outcomeId,
        odds: o.odds,
        name: o.name,
        marketName: o.marketName,
        fixtureName: o.fixtureName,
        fixtureSlug: o.fixtureSlug,
        status: params.status,
        result: null,
      });
    }
  } catch {
    // DB persistence failure is non-critical — bet was placed via API
    // The API result is the source of truth; DB is for local history
    console.warn("Failed to persist bet to local database:", betId);
  }
}
