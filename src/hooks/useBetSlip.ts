/**
 * Real implementation of useBetSlip — backed by the Zustand slip store.
 * Reads/writes the active slip in the unified slips[] array.
 * @module hooks/useBetSlip
 */

import { useCallback, useMemo } from "react";
import { useSlipStore } from "@/store/useSlipStore";
import type { SlipData } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBalance } from "./useBalance";
import { calculatePotentialReturn, calculateTotalStake, validateSlip } from "@/lib/state/slipLogic";
import { executeBetPlacement, type BetPlacementResult } from "@/lib/state/betPlacement";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { SlipMode } from "@/lib/contracts/db.contract";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import { useUIStore } from "@/store/useUIStore";

/** Get the active slip from raw state (non-reactive helper for .getState() calls). */
function getActiveSlip(state: ReturnType<typeof useSlipStore.getState>): SlipData | null {
  if (!state.activeSlipId) return state.slips[0] ?? null;
  return state.slips.find((s) => s.id === state.activeSlipId) ?? state.slips[0] ?? null;
}

export function useBetSlip() {
  // ── Active slip read (reactive) ─────────────────────────────────────────
  const activeSlip = useSlipStore((s) => {
    if (!s.activeSlipId) return s.slips[0] ?? null;
    return s.slips.find((slip) => slip.id === s.activeSlipId) ?? s.slips[0] ?? null;
  });

  const selections = activeSlip?.selections ?? [];
  const mode = activeSlip?.mode ?? "singles";
  const stakePerLeg = activeSlip?.stakePerLeg ?? 1000;
  const stakeShieldEnabled = activeSlip?.stakeShieldEnabled ?? false;
  const isPlacing = activeSlip?.isPlacing ?? false;
  const placeResults = activeSlip?.placeResults ?? [];
  const lastError = activeSlip?.lastError ?? null;

  // ── Per-slip mutations ──────────────────────────────────────────────────
  const addSelection = useSlipStore((s) => s.addSelection);
  const addMultipleSelections = useSlipStore((s) => s.addMultipleSelections);
  const removeSelection = useSlipStore((s) => s.removeSelection);
  const clearSelections = useSlipStore((s) => s.clearSelections);
  const setMode = useSlipStore((s) => s.setMode);
  const setStakePerLeg = useSlipStore((s) => s.setStakePerLeg);
  const setStakeShieldEnabled = useSlipStore((s) => s.setStakeShieldEnabled);
  const setPlacing = useSlipStore((s) => s.setPlacing);
  const setPlaceResults = useSlipStore((s) => s.setPlaceResults);
  const setLastError = useSlipStore((s) => s.setLastError);
  const addToast = useUIStore((s) => s.addToast);

  // ── All slips / compute helpers ─────────────────────────────────────────
  const allSlips = useSlipStore((s) => s.slips);
  const createSlip = useSlipStore((s) => s.createSlip);
  const deleteSlip = useSlipStore((s) => s.deleteSlip);
  const clearSlip = useSlipStore((s) => s.clearSlip);
  const switchSlip = useSlipStore((s) => s.switchSlip);

  const currency = useSettingsStore((s) => s.currency);
  const { balance, refetch: refetchBalance } = useBalance();

  const potentialReturn = useMemo(
    () => calculatePotentialReturn(selections, mode, stakePerLeg, undefined, stakeShieldEnabled),
    [selections, mode, stakePerLeg, stakeShieldEnabled],
  );

  const totalStake = useMemo(
    () => calculateTotalStake(selections, mode, stakePerLeg),
    [selections, mode, stakePerLeg],
  );

  /** Place bets for the currently active slip. */
  const placeBets = useCallback(async (): Promise<BetPlacementResult[]> => {
    const state = useSlipStore.getState();
    const slip = getActiveSlip(state);

    if (!slip || slip.selections.length === 0) {
      setLastError("No selections in the slip.");
      return [];
    }

    const balanceAmount = balance?.amount ?? null;
    const slipTotalStake = calculateTotalStake(slip.selections, slip.mode, slip.stakePerLeg);
    const validationErrors = validateSlip(
      slip.selections,
      balanceAmount,
      slipTotalStake,
      slip.mode,
    );

    if (validationErrors.length > 0) {
      setLastError(validationErrors.join("; "));
      return [];
    }

    setPlacing(true);
    setLastError(null);
    setPlaceResults([]);

    try {
      const results = await executeBetPlacement({
        selections: slip.selections,
        mode: slip.mode,
        stakePerLeg: slip.stakePerLeg,
        currency,
        balance: balanceAmount,
        stakeShieldEnabled: slip.mode === "parlay" ? slip.stakeShieldEnabled : false,
      });

      setPlaceResults(results);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount > 0 && successCount > 0) {
        setLastError(`${successCount} bet(s) placed, ${failCount} failed.`);
      } else if (failCount > 0) {
        setLastError(results[0]?.error ?? "All bets failed.");
      }

      if (successCount > 0) {
        refetchBalance();
      }

      return results;
    } catch (err) {
      const errType = classifyError(err);
      const message = getUserFriendlyMessage(errType);
      setLastError(message);
      addToast({ type: "error", title: "Bet Placement", description: message, duration: 5000 });
      return [];
    } finally {
      setPlacing(false);
    }
  }, [currency, balance, totalStake, setPlacing, setLastError, setPlaceResults, refetchBalance]);

  /** Place bets for a specific slip by ID (used when active slip != target slip). */
  const placeBetsForGroup = useCallback(
    async (groupId: string): Promise<BetPlacementResult[]> => {
      const group = useSlipStore.getState().slips.find((s) => s.id === groupId);
      if (!group || group.selections.length === 0) return [];

      const balanceAmount = balance?.amount ?? null;
      const groupTotalStake = calculateTotalStake(group.selections, group.mode, group.stakePerLeg);
      const errors = validateSlip(group.selections, balanceAmount, groupTotalStake, group.mode);
      if (errors.length > 0) {
        useSlipStore.getState().setLastError(errors.join("; "));
        return [];
      }

      // Switch to the target slip, place, then switch back? No — place directly via set() on the target slip.
      // We mutate the target slip's transient fields directly.
      const setPlacingFor = (id: string, v: boolean) => {
        useSlipStore.setState((st) => ({
          slips: st.slips.map((s) => (s.id === id ? { ...s, isPlacing: v } : s)),
        }));
      };
      const setErrorFor = (id: string, error: string | null) => {
        useSlipStore.setState((st) => ({
          slips: st.slips.map((s) => (s.id === id ? { ...s, lastError: error } : s)),
        }));
      };
      const setResultsFor = (id: string, results: BetPlacementResult[]) => {
        useSlipStore.setState((st) => ({
          slips: st.slips.map((s) => (s.id === id ? { ...s, placeResults: results } : s)),
        }));
      };

      setPlacingFor(groupId, true);
      setErrorFor(groupId, null);
      setResultsFor(groupId, []);

      try {
        const results = await executeBetPlacement({
          selections: group.selections,
          mode: group.mode,
          stakePerLeg: group.stakePerLeg,
          currency,
          balance: balanceAmount,
          stakeShieldEnabled: group.mode === "parlay" ? group.stakeShieldEnabled : false,
        });

        setResultsFor(groupId, results);

        if (results.some((r) => r.success)) {
          refetchBalance();
        }

        return results;
      } catch (err) {
        const errType = classifyError(err);
        const message = getUserFriendlyMessage(errType);
        setErrorFor(groupId, message);
        addToast({ type: "error", title: "Bet Placement", description: message, duration: 5000 });
        return [];
      } finally {
        setPlacingFor(groupId, false);
      }
    },
    [currency, balance, refetchBalance],
  );

  return {
    // Active slip
    selections,
    mode,
    stakePerLeg,
    stakeShieldEnabled,
    totalStake,
    isPlacing,
    placeResults,
    lastError,
    potentialReturn,
    addSelection,
    addMultipleSelections,
    removeSelection,
    clearSelections,
    setMode,
    setStakePerLeg,
    setStakeShieldEnabled,
    setPlacing,
    setPlaceResults,
    setLastError,
    placeBets,
    // Multi-slip
    allSlips,
    createSlip,
    deleteSlip,
    clearSlip,
    switchSlip,
    placeBetsForGroup,
  };
}

export type { BetSelection, SlipMode, SlipData };
