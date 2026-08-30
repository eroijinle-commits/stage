/**
 * Typed GraphQL mutations for the Stake.com API.
 * Updated for the current Stake GraphQL schema (2025+).
 * @module lib/stake-api/mutations
 */

import { executeQuery } from "./client";
import type { PlaceBetParams, PlaceResult } from "./types";

/**
 * Place a sports bet (single or multi-leg parlay).
 * Uses the sportBet mutation with the current Stake API.
 *
 * @param params.outcomeIds - Array of outcome IDs to bet on
 * @param params.amounts - Stake amount per outcome (first amount used as total)
 * @param params.currency - Currency code (e.g. "NGN")
 * @param params.odds - Odds per outcome (used for odds change detection)
 * @param params.betType - "sports" for single bets, "multi" for parlay
 * @returns The placed bet details
 */
export async function placeBetMutation(params: PlaceBetParams): Promise<PlaceResult> {
  const { outcomeIds, amounts, currency, odds: _odds, betType, stakeShieldEnabled } = params;

  // sportBet uses a single amount (total stake) and lowercase enum values
  const totalAmount = amounts.reduce((sum, a) => sum + a, 0);

  const query = `
    mutation SportBetSlip(
      $outcomeIds: [String!]!,
      $amount: Float!,
      $currency: CurrencyEnum!,
      $betType: SportBetTypeEnum!,
      $oddsChange: SportOddsChangeEnum!,
      $stakeShieldEnabled: Boolean
    ) {
      sportBet(
        outcomeIds: $outcomeIds,
        amount: $amount,
        currency: $currency,
        betType: $betType,
        oddsChange: $oddsChange,
        stakeShieldEnabled: $stakeShieldEnabled
      ) {
        id
        amount
        currency
        potentialMultiplier
        outcomes {
          id
          odds
          market {
            name
          }
          fixtureName
        }
        customPrices {
          customOdds
          type
          stakeShield {
            offerOdds
            protectionLevel
          }
        }
        status
        createdAt
      }
    }
  `;

  const data = await executeQuery<{ sportBet: PlaceResult }>({
    query,
    variables: {
      outcomeIds,
      amount: totalAmount,
      currency: currency.toUpperCase(),
      betType: betType === "multi" ? "multi" : "sports",
      oddsChange: "higher",
      stakeShieldEnabled: stakeShieldEnabled ?? false,
    },
    operationName: "SportBetSlip",
    operationType: "mutation",
  });

  return data.sportBet;
}
