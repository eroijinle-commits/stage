/**
 * Real implementation of useBetSlip — backed by the Zustand slip store.
 * Provides bet slip state, calculations, and the placeBets action.
 * @module hooks/useBetSlip
 */

import { useCallback, useMemo } from "react";
import { useSlipStore } from "@/store/useSlipStore";
import type { ComputeSlipEntry } from "@/store/useSlipStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useBalance } from "./useBalance";
import { calculatePotentialReturn, calculateTotalStake, validateSlip } from "@/lib/state/slipLogic";
import { executeBetPlacement, type BetPlacementResult } from "@/lib/state/betPlacement";
import type { BetSelection } from "@/lib/contracts/ui.contract";
import type { SlipMode } from "@/lib/contracts/db.contract";

export function useBetSlip() {
    const selections = useSlipStore((s) => s.selections);
    const mode = useSlipStore((s) => s.mode);
    const stakePerLeg = useSlipStore((s) => s.stakePerLeg);
    const stakeShieldEnabled = useSlipStore((s) => s.stakeShieldEnabled);
    const isPlacing = useSlipStore((s) => s.isPlacing);
    const placeResults = useSlipStore((s) => s.placeResults);
    const lastError = useSlipStore((s) => s.lastError);

    const addSelection = useSlipStore((s) => s.addSelection);
    const removeSelection = useSlipStore((s) => s.removeSelection);
    const clearSelections = useSlipStore((s) => s.clearSelections);
    const setMode = useSlipStore((s) => s.setMode);
    const setStakePerLeg = useSlipStore((s) => s.setStakePerLeg);
    const setStakeShieldEnabled = useSlipStore((s) => s.setStakeShieldEnabled);
    const setPlacing = useSlipStore((s) => s.setPlacing);
    const setPlaceResults = useSlipStore((s) => s.setPlaceResults);
    const setLastError = useSlipStore((s) => s.setLastError);

    // ── Compute slip isolation ────────────────────────────────────────────
    const computeSlips = useSlipStore((s) => s.computeSlips);
    const removeComputeSlip = useSlipStore((s) => s.removeComputeSlip);
    const clearComputeSlips = useSlipStore((s) => s.clearComputeSlips);
    const updateComputeSlip = useSlipStore((s) => s.updateComputeSlip);

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

    const placeBets = useCallback(async (): Promise<BetPlacementResult[]> => {
        if (selections.length === 0) {
            setLastError("No selections in the slip.");
            return [];
        }

        const balanceAmount = balance?.amount ?? null;
        const validationErrors = validateSlip(selections, balanceAmount, totalStake);
        if (validationErrors.length > 0) {
            setLastError(validationErrors.join("; "));
            return [];
        }

        setPlacing(true);
        setLastError(null);
        setPlaceResults([]);

        try {
            const results = await executeBetPlacement({
                selections,
                mode,
                stakePerLeg,
                currency,
                balance: balanceAmount,
                stakeShieldEnabled: mode === "parlay" ? stakeShieldEnabled : false,
            });

            setPlaceResults(results);

            const successCount = results.filter((r) => r.success).length;
            const failCount = results.filter((r) => !r.success).length;

            if (failCount > 0 && successCount > 0) {
                setLastError(`${successCount} bet(s) placed, ${failCount} failed.`);
            } else if (failCount > 0) {
                setLastError(results[0]?.error ?? "All bets failed.");
            }

            // Refresh balance after placement
            if (successCount > 0) {
                refetchBalance();
            }

            return results;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Bet placement failed";
            setLastError(message);
            return [];
        } finally {
            setPlacing(false);
        }
    }, [
        selections,
        mode,
        stakePerLeg,
        stakeShieldEnabled,
        currency,
        balance,
        totalStake,
        setPlacing,
        setLastError,
        setPlaceResults,
        refetchBalance,
    ]);

    /** Place bets for a specific compute slip (isolated). */
    const placeBetsForGroup = useCallback(async (groupId: string): Promise<BetPlacementResult[]> => {
        const group = useSlipStore.getState().computeSlips.find((g) => g.id === groupId);
        if (!group || group.selections.length === 0) return [];

        const balanceAmount = balance?.amount ?? null;
        const groupTotalStake = calculateTotalStake(group.selections, group.mode, group.stakePerLeg);
        const errors = validateSlip(group.selections, balanceAmount, groupTotalStake);
        if (errors.length > 0) {
            useSlipStore.getState().setComputeSlipError(groupId, errors.join("; "));
            return [];
        }

        useSlipStore.getState().setComputeSlipPlacing(groupId, true);
        useSlipStore.getState().setComputeSlipError(groupId, null);
        useSlipStore.getState().setComputeSlipResults(groupId, []);

        try {
            const results = await executeBetPlacement({
                selections: group.selections,
                mode: group.mode,
                stakePerLeg: group.stakePerLeg,
                currency,
                balance: balanceAmount,
                stakeShieldEnabled: group.mode === "parlay" ? group.stakeShieldEnabled : false,
            });

            useSlipStore.getState().setComputeSlipResults(groupId, results);

            if (results.some((r) => r.success)) {
                refetchBalance();
            }

            return results;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Bet placement failed";
            useSlipStore.getState().setComputeSlipError(groupId, message);
            return [];
        } finally {
            useSlipStore.getState().setComputeSlipPlacing(groupId, false);
        }
    }, [currency, balance, refetchBalance]);

    return {
        // Manual slip
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
        removeSelection,
        clearSelections,
        setMode,
        setStakePerLeg,
        setStakeShieldEnabled,
        placeBets,
        // Compute slip isolation
        computeSlips,
        removeComputeSlip,
        clearComputeSlips,
        updateComputeSlip,
        placeBetsForGroup,
    };
}

export type { BetSelection, SlipMode, ComputeSlipEntry };
