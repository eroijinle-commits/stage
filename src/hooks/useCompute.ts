/**
 * React hook that orchestrates the compute pipeline:
 * fetch fixture details → filter markets → select top → generate permutations.
 * Exposes config controls, results, and actions to add slips to the bet slip store.
 * @module hooks/useCompute
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import type {
    ComputeConfig,
    ComputeResult,
    ComputeSlip,
    RankedMarket,
} from "@/lib/compute/types";
import { SLIP_OPTIONS, marketsNeeded } from "@/lib/compute/types";
import {
    flattenAllMarkets,
    filterByOutcomeCount,
    selectTopMarkets,
} from "@/lib/compute/marketFilter";
import { generateAllPermutations } from "@/lib/compute/cartesian";
import { getFixtureDetailsQuery } from "@/lib/stake-api/queries";
import { useSlipStore } from "@/store/useSlipStore";
import type { ComputeSlipEntry } from "@/store/useSlipStore";
import type { StakeGroupWithMarkets } from "@/lib/contracts/api.contract";

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ComputeConfig = { maxOutcomes: 2, slipCount: 16 };

// ─── Conversion: ComputeSlip → BetSelection[] ────────────────────────────────

/**
 * Convert a single ComputeSlip into an array of BetSelection objects
 * suitable for adding to the slip store.
 */
export function computeSlipToBetSelections(
    slip: ComputeSlip,
    fixture: DiscoveryFixture,
): BetSelection[] {
    return slip.selections.map((sel) => ({
        id: `${slip.id}-${sel.outcomeId}`,
        fixtureSlug: fixture.slug,
        fixtureName: fixture.name,
        fixtureId: fixture.id,
        tournamentName: fixture.tournament?.name ?? "",
        marketId: sel.marketId,
        marketName: sel.marketName,
        outcomeId: sel.outcomeId,
        outcomeName: sel.outcomeName,
        odds: sel.odds,
        active: true,
        startTime: fixture.startTime,
        addedAt: Date.now(),
        betType: "compute",
        betTypeLine: null,
        sport: fixture.sport,
        stakeUrl: fixture.stakeUrl,
    }));
}

// ─── Hook return type ────────────────────────────────────────────────────────

export interface UseComputeReturn {
    /** Current compute configuration */
    config: ComputeConfig;
    /** Update configuration */
    setConfig: (config: ComputeConfig) => void;
    /** Result of the last compute run (null if not yet run) */
    result: ComputeResult | null;
    /** Whether a compute pipeline is in progress */
    isLoading: boolean;
    /** Error message from the last failed compute run */
    error: string | null;
    /** Live permutation count based on current config and available fixture data */
    permutationCount: number;
    /** Available slip count options derived from maxOutcomes */
    availableSlipCounts: number[];
    /** Whether generation is allowed (enough qualifying markets) */
    canGenerate: boolean;
    /** Run the full compute pipeline */
    runCompute: () => Promise<void>;
    /** Add a single ComputeSlip to the bet slip store */
    addSlipToBetSlip: (slip: ComputeSlip) => void;
    /** Add multiple slips by their IDs from the current result */
    addSelectedSlips: (ids: string[]) => void;
    /** Add all generated slips to the bet slip store */
    addAllSlips: () => void;
    /** Retry the last failed compute run */
    retry: () => Promise<void>;
    /** Clear error state */
    clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Orchestrates the compute pipeline for a single fixture.
 *
 * @param fixture - The discovery fixture to compute for, or null if none selected.
 */
export function useCompute(fixture: DiscoveryFixture | null): UseComputeReturn {
    const [config, setConfig] = useState<ComputeConfig>(DEFAULT_CONFIG);
    const [result, setResult] = useState<ComputeResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Raw market groups from the last successful API fetch.
    const [marketGroups, setMarketGroups] = useState<StakeGroupWithMarkets[]>([]);

    const addComputeSlip = useSlipStore((s) => s.addComputeSlip);
    const addComputeSlips = useSlipStore((s) => s.addComputeSlips);

    // ─── Available slip count options ──────────────────────────────────────

    const availableSlipCounts = useMemo(
        () => SLIP_OPTIONS[config.maxOutcomes],
        [config.maxOutcomes],
    );

    // ─── Reset slipCount when maxOutcomes changes ──────────────────────────

    const setConfigStable = useCallback(
        (next: ComputeConfig) => {
            setConfig((prev) => {
                // If maxOutcomes changed, reset slipCount to first valid option
                if (next.maxOutcomes !== prev.maxOutcomes) {
                    return { maxOutcomes: next.maxOutcomes, slipCount: SLIP_OPTIONS[next.maxOutcomes][0] };
                }
                return next;
            });
        },
        [],
    );

    // ─── Auto-fetch market data on fixture change ────────────────────────

    useEffect(() => {
        if (!fixture) {
            setMarketGroups([]);
            setResult(null);
            setError(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const details = await getFixtureDetailsQuery(fixture.slug);
                if (cancelled || !details?.marketGroups) return;
                setMarketGroups(details.marketGroups);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                const message =
                    err instanceof Error ? err.message : "Failed to load fixture data";
                setError(message);
            }
        })();

        return () => { cancelled = true; };
    }, [fixture]);

    // ─── Derived: live permutation count ──────────────────────────────────

    const permutationCount = useMemo(() => {
        if (marketGroups.length === 0) return 0;
        const needed = marketsNeeded(config.slipCount, config.maxOutcomes);
        const allMarkets = flattenAllMarkets(marketGroups);
        const qualifying = filterByOutcomeCount(allMarkets, config.maxOutcomes);
        if (qualifying.length < needed) return 0;
        const topN = qualifying.slice(0, needed);
        return topN.reduce((acc, m) => acc * m.outcomeCount, 1);
    }, [config, marketGroups]);

    const canGenerate = permutationCount > 0;

    // ─── Actions ──────────────────────────────────────────────────────────

    /**
     * Run the full compute pipeline.
     * Fetches fixture details if not already loaded, then filters and generates.
     */
    const runCompute = useCallback(async () => {
        if (!fixture) {
            setError("No fixture selected");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Fetch fixture details (market groups with markets and outcomes)
            const details = await getFixtureDetailsQuery(fixture.slug);
            setMarketGroups(details.marketGroups);

            // Select top N markets using the flat pipeline
            const selectedMarkets = selectTopMarkets(details.marketGroups, config);

            // Generate Cartesian product from flat array
            const slips = generateAllPermutations(selectedMarkets);

            const computeResult: ComputeResult = {
                fixtureName: fixture.name,
                fixtureSlug: fixture.slug,
                selectedMarkets,
                totalPermutations: slips.length,
                slips,
            };

            setResult(computeResult);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Failed to fetch fixture details";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, [fixture, config]);

    /** Retry the last failed compute run. */
    const retry = useCallback(async () => {
        await runCompute();
    }, [runCompute]);

    /** Clear error state. */
    const clearError = useCallback(() => setError(null), []);

    /** Add a single ComputeSlip as an isolated entry in the bet slip store. */
    const addSlipToBetSlip = useCallback(
        (slip: ComputeSlip) => {
            if (!fixture) return;
            const selections = computeSlipToBetSelections(slip, fixture);
            const entry: ComputeSlipEntry = {
                id: slip.id,
                name: `Slip`,
                selections,
                mode: "singles",
                stakePerLeg: 1000,
                stakeShieldEnabled: false,
                isPlacing: false,
                placeResults: [],
                lastError: null,
                createdAt: Date.now(),
            };
            addComputeSlip(entry);
        },
        [fixture, addComputeSlip],
    );

    /** Add multiple slips by their IDs as isolated entries. */
    const addSelectedSlips = useCallback(
        (ids: string[]) => {
            if (!fixture || !result) return;
            const selectedSlips = result.slips.filter((s) => ids.includes(s.id));
            const entries: ComputeSlipEntry[] = selectedSlips.map((slip) => ({
                id: slip.id,
                name: `Slip`,
                selections: computeSlipToBetSelections(slip, fixture),
                mode: "singles" as const,
                stakePerLeg: 1000,
                stakeShieldEnabled: false,
                isPlacing: false,
                placeResults: [],
                lastError: null,
                createdAt: Date.now(),
            }));
            addComputeSlips(entries);
        },
        [fixture, result, addComputeSlips],
    );

    /** Add all generated slips as isolated entries. */
    const addAllSlips = useCallback(() => {
        if (!fixture || !result) return;
        const entries: ComputeSlipEntry[] = result.slips.map((slip, i) => ({
            id: slip.id,
            name: `Slip ${i + 1}`,
            selections: computeSlipToBetSelections(slip, fixture),
            mode: "singles" as const,
            stakePerLeg: 1000,
            stakeShieldEnabled: false,
            isPlacing: false,
            placeResults: [],
            lastError: null,
            createdAt: Date.now(),
        }));
        addComputeSlips(entries);
    }, [fixture, result, addComputeSlips]);

    return {
        config,
        setConfig: setConfigStable,
        result,
        isLoading,
        error,
        permutationCount,
        availableSlipCounts,
        canGenerate,
        runCompute,
        addSlipToBetSlip,
        addSelectedSlips,
        addAllSlips,
        retry,
        clearError,
    };
}
