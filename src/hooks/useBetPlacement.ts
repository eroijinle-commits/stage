/**
 * React hook for placing bets via the Stake API.
 * Handles single and multi-leg bet placement with progress tracking.
 * @module hooks/useBetPlacement
 */

import { useState, useCallback } from "react";
import { placeBetMutation } from "@/lib/stake-api/mutations";
import type { PlaceBetParams, PlaceResult } from "@/lib/stake-api/types";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";

interface UseBetPlacementReturn {
  /** Place one or more bets. For singles, each selection is placed individually. */
  placeBets: (params: PlaceBetParams) => Promise<PlaceResult[]>;
  /** Whether bets are currently being placed */
  isPlacing: boolean;
  /** Progress as a percentage (0-100) */
  progress: number;
}

/**
 * Hook that wraps bet placement with progress tracking and error handling.
 * For "singles" mode, places each selection as a separate bet.
 * For "multi" mode, places all outcomes in a single parlay bet.
 */
export function useBetPlacement(): UseBetPlacementReturn {
  const [isPlacing, setIsPlacing] = useState(false);
  const [progress, setProgress] = useState(0);

  const placeBets = useCallback(async (params: PlaceBetParams): Promise<PlaceResult[]> => {
    const { outcomeIds, amounts, currency, odds, betType } = params;

    setIsPlacing(true);
    setProgress(0);

    const results: PlaceResult[] = [];

    try {
      if (betType === "multi") {
        // Multi-leg parlay — place as a single bet
        setProgress(10);
        const result = await placeBetMutation({
          outcomeIds,
          amounts,
          currency,
          odds,
          betType: "multi",
        });
        results.push(result);
        setProgress(100);
      } else {
        // Singles — place each selection individually
        for (let i = 0; i < outcomeIds.length; i++) {
          const pct = Math.round((i / outcomeIds.length) * 90);
          setProgress(pct);

          try {
            const result = await placeBetMutation({
              outcomeIds: [outcomeIds[i]],
              amounts: [amounts[i]],
              currency,
              odds: [odds[i]],
              betType: "sports",
            });
            results.push(result);
          } catch (err) {
            // For singles, continue placing the rest even if one fails
            // Classify the ACTUAL error from the API, not a generic one
            const errorType = classifyError(err);
            throw new Error(getUserFriendlyMessage(errorType));
          }

          setProgress(Math.round(((i + 1) / outcomeIds.length) * 100));
        }
      }
    } finally {
      setIsPlacing(false);
      setProgress(100);
    }

    return results;
  }, []);

  return {
    placeBets,
    isPlacing,
    progress,
  };
}
