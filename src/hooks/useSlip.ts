/**
 * Convenience hooks for the multi-slip store.
 * @module hooks/useSlip
 */

import { useMemo } from "react";
import { useSlipStore, type SlipData } from "@/store/useSlipStore";

/** Returns the currently active slip, or null if none is set. */
export function useActiveSlip(): SlipData | null {
    return useSlipStore((s) => {
        if (!s.activeSlipId) return s.slips[0] ?? null;
        return s.slips.find((slip) => slip.id === s.activeSlipId) ?? s.slips[0] ?? null;
    });
}

/** Returns all slips in the store. */
export function useAllSlips(): SlipData[] {
    return useSlipStore((s) => s.slips);
}

/** Returns total selection count across all slips. */
export function useTotalSelectionCount(): number {
    return useSlipStore((s) =>
        s.slips.reduce((acc, slip) => acc + slip.selections.length, 0),
    );
}

/** Active slip selector helpers. */
export function useActiveSlipId(): string {
    return useSlipStore((s) => s.activeSlipId);
}

export function useSlipActions() {
    return useSlipStore((s) => ({
        createSlip: s.createSlip,
        switchSlip: s.switchSlip,
        deleteSlip: s.deleteSlip,
        renameSlip: s.renameSlip,
        duplicateSlip: s.duplicateSlip,
        clearSlip: s.clearSlip,
        addSelection: s.addSelection,
        addMultipleSelections: s.addMultipleSelections,
        removeSelection: s.removeSelection,
        clearSelections: s.clearSelections,
        setMode: s.setMode,
        setStakePerLeg: s.setStakePerLeg,
        setStakeShieldEnabled: s.setStakeShieldEnabled,
        setPlacing: s.setPlacing,
        setPlaceResults: s.setPlaceResults,
        setLastError: s.setLastError,
        updateOdds: s.updateOdds,
        shareSlip: s.shareSlip,
        restoreSlip: s.restoreSlip,
        saveSlip: s.saveSlip,
        loadSlip: s.loadSlip,
        deleteSavedSlip: s.deleteSavedSlip,
    }));
}

/** Stable active slip-derived values for panels/summary. */
export function useActiveSlipSummary() {
    const slip = useActiveSlip();
    const currency = useSlipStore((s) => "NGN"); // placeholder until settings wired
    return useMemo(() => {
        if (!slip) {
            return {
                mode: "singles" as const,
                selectionCount: 0,
                currency,
                totalStake: 0,
                displayReturn: 0,
                potentialProfit: 0,
                stakePerLeg: 1000,
                stakeShieldEnabled: false,
                totalOdds: undefined as number | undefined,
                isPlacing: false,
                placed: false,
            };
        }
        const totalOdds = slip.selections.reduce((acc, s) => acc * s.odds, 1);
        return {
            mode: slip.mode,
            selectionCount: slip.selections.length,
            currency,
            totalStake: 0,
            displayReturn: 0,
            potentialProfit: 0,
            stakePerLeg: slip.stakePerLeg,
            stakeShieldEnabled: slip.stakeShieldEnabled,
            totalOdds: slip.mode === "parlay" ? totalOdds : undefined,
            isPlacing: slip.isPlacing,
            placed: slip.placeResults.length > 0,
        };
    }, [slip, currency]);
}
