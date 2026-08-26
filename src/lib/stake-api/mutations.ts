/**
 * Typed GraphQL mutations for the Stake.com API.
 * @module lib/stake-api/mutations
 */

import { executeQuery } from "./client";
import type { PlaceBetParams, PlaceResult } from "./types";

/**
 * Place a bet (single or multi-leg parlay).
 *
 * @param params.outcomeIds - Array of outcome IDs to bet on
 * @param params.amounts - Stake amount per outcome
 * @param params.currency - Currency code (e.g. "NGN")
 * @param params.odds - Odds per outcome
 * @param params.betType - "sports" for single bets, "multi" for parlay
 * @returns The placed bet details
 */
export async function placeBetMutation(params: PlaceBetParams): Promise<PlaceResult> {
    const { outcomeIds, amounts, currency, odds, betType } = params;

    const query = `
    mutation BetSlipFooter_SportBet(
      $outcomeIds: [String!]!,
      $amounts: [Float!]!,
      $currency: String!,
      $odds: [Float!]!,
      $betType: String!
    ) {
      placeBet(
        outcomeIds: $outcomeIds,
        amounts: $amounts,
        currency: $currency,
        odds: $odds,
        betType: $betType
      ) {
        id
        amount
        currency
        odds
        potentialMultiplier
        outcomes {
          id
          odds
          name
          marketName
          fixtureName
        }
        status
        createdAt
      }
    }
  `;

    const data = await executeQuery<{ placeBet: PlaceResult }>({
        query,
        variables: { outcomeIds, amounts, currency, odds, betType },
        operationName: "BetSlipFooter_SportBet",
        operationType: "mutation",
    });

    return data.placeBet;
}
