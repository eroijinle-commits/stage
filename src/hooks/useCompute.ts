/**
 * React hook that orchestrates the compute pipeline:
 * fetch fixture details → filter markets → build matrix → generate permutations.
 * Exposes config controls, results, and actions to add slips to the bet slip store.
 * @module hooks/useCompute
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import type { DiscoveryFixture, BetSelection } from "@/lib/contracts/ui.contract";
import type {
    ComputeConfig,
    ComputeResult,
    ComputeSlip,
    RankedGroup,
} from "@/lib/compute/types";
import { MAX_PERMUTATIONS, estimatePermutations } from "@/lib/compute/types";
import {
    rankGroupsByOdds,
    buildFilteredMatrix,
    selectTopGroups,
    rankMarketsInGroup,
} from "@/lib/compute/marketFilter";
import { generateAllPermutations } from "@/lib/compute/cartesian";
import { getFixtureDetailsQuery } from "@/lib/stake-api/queries";
import { useSlipStore } from "@/store/useSlipStore";
import type { StakeGroupWithMarkets } from "@/lib/contracts/api.contract";

// ─── Default config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ComputeConfig = { groups: 3, marketsPerGroup: 2 };

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
    /** Whether market data has been fetched (rankedGroups is populated) */
    dataLoaded: boolean;
    /** Whether generation is allowed (count > 0 and within cap) */
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

    // Ranked groups from the last successful API fetch. Stored in state so that
    // permutationCount recomputes when it changes (and when config changes).
    const [rankedGroups, setRankedGroups] = useState<RankedGroup[]>([]);

    const addMultipleSelections = useSlipStore((s) => s.addMultipleSelections);

    // ─── Auto-fetch market data on fixture change ────────────────────────────
    // Fetches fixture details when a fixture is provided, so sliders have
    // real market constraints and permutation count is live immediately.
    useEffect(() => {
        if (!fixture) {
            setRankedGroups([]);
            setResult(null);
            setError(null);
            return;
        }

        let cancelled = false;

        (async () => {
            try {
                const details = await getFixtureDetailsQuery(fixture.slug);
                if (cancelled || !details?.marketGroups) return;
                const ranked = rankGroupsByOdds(details.marketGroups);
                setRankedGroups(ranked);
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

    // ─── Derived: live permutation count ──────────────────────────────────────

    const permutationCount = useMemo(() => {
        if (rankedGroups.length === 0) return 0;
        const matrix = buildFilteredMatrix(rankedGroups, config);
        return estimatePermutations(matrix);
    }, [config, rankedGroups]);

    const dataLoaded = rankedGroups.length > 0;
    const canGenerate = permutationCount > 0 && permutationCount <= MAX_PERMUTATIONS;

    // ─── Actions ──────────────────────────────────────────────────────────────

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

            // Rank groups from raw API data
            const ranked = rankGroupsByOdds(details.marketGroups);
            setRankedGroups(ranked);

            // Build the filtered matrix using current config
            const matrix = buildFilteredMatrix(ranked, config);
            const slips = generateAllPermutations(matrix);

            // Build selected groups summary (the groups/markets that were picked)
            const topGroups = selectTopGroups(ranked, config.groups);
            const selectedGroups = topGroups.map((group) =>
                rankMarketsInGroup(group, config.marketsPerGroup),
            );

            const computeResult: ComputeResult = {
                fixtureName: fixture.name,
                fixtureSlug: fixture.slug,
                config: { ...config },
                selectedGroups,
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

    /** Add a single ComputeSlip to the bet slip store. */
    const addSlipToBetSlip = useCallback(
        (slip: ComputeSlip) => {
            if (!fixture) return;
            const selections = computeSlipToBetSelections(slip, fixture);
            addMultipleSelections(selections);
        },
        [fixture, addMultipleSelections],
    );

    /** Add multiple slips by their IDs from the current result. */
    const addSelectedSlips = useCallback(
        (ids: string[]) => {
            if (!fixture || !result) return;
            const selectedSlips = result.slips.filter((s) => ids.includes(s.id));
            const allSelections = selectedSlips.flatMap((slip) =>
                computeSlipToBetSelections(slip, fixture),
            );
            addMultipleSelections(allSelections);
        },
        [fixture, result, addMultipleSelections],
    );

    /** Add all generated slips to the bet slip store. */
    const addAllSlips = useCallback(() => {
        if (!fixture || !result) return;
        const allSelections = result.slips.flatMap((slip) =>
            computeSlipToBetSelections(slip, fixture),
        );
        addMultipleSelections(allSelections);
    }, [fixture, result, addMultipleSelections]);

    return {
        config,
        setConfig,
        result,
        isLoading,
        error,
        permutationCount,
        dataLoaded,
        canGenerate,
        runCompute,
        addSlipToBetSlip,
        addSelectedSlips,
        addAllSlips,
        retry,
        clearError,
    };
}
