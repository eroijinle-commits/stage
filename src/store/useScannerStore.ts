/**
 * useScannerStore — persists Value Scanner state across tab switches.
 * @module store/useScannerStore
 */

import { create } from "zustand";
import type { StakeFixture, StakeMarket } from "@/lib/contracts/api.contract";
import type { FixtureFailure } from "@/lib/scanner/errors";
import type { FlaggedResult, ScannerPhase } from "@/hooks/useValueScanner";

interface ScannerStore {
    rawFixtures: StakeFixture[];
    marketsCache: Map<string, StakeMarket[]>;
    failedFixtures: FixtureFailure[];
    isLoading: boolean;
    phase: ScannerPhase;
    error: string | null;
    lastSport: string | null;
    /** Tracks which sports have been fetched in this session to prevent remount refetch */
    fetchedSports: string[];

    setRawFixtures: (fixtures: StakeFixture[]) => void;
    setMarketsCache: (updater: (prev: Map<string, StakeMarket[]>) => Map<string, StakeMarket[]>) => void;
    setFailedFixtures: (failures: FixtureFailure[]) => void;
    appendFailedFixtures: (failures: FixtureFailure[]) => void;
    setIsLoading: (v: boolean) => void;
    setPhase: (p: ScannerPhase) => void;
    setError: (e: string | null) => void;
    setLastSport: (s: string) => void;
    markSportFetched: (sport: string) => void;
    reset: () => void;
}

const INITIAL: Pick<ScannerStore, "rawFixtures" | "marketsCache" | "failedFixtures" | "isLoading" | "phase" | "error" | "lastSport" | "fetchedSports"> = {
    rawFixtures: [],
    marketsCache: new Map(),
    failedFixtures: [],
    isLoading: false,
    phase: "idle",
    error: null,
    lastSport: null,
    fetchedSports: [],
};

export const useScannerStore = create<ScannerStore>((set) => ({
    ...INITIAL,

    setRawFixtures: (rawFixtures) => set({ rawFixtures }),
    setMarketsCache: (updater) =>
        set((state) => ({ marketsCache: updater(state.marketsCache) })),
    setFailedFixtures: (failedFixtures) => set({ failedFixtures }),
    appendFailedFixtures: (newFailures) =>
        set((state) => ({
            failedFixtures: [...state.failedFixtures, ...newFailures],
        })),
    setIsLoading: (isLoading) => set({ isLoading }),
    setPhase: (phase) => set({ phase }),
    setError: (error) => set({ error }),
    setLastSport: (lastSport) => set({ lastSport }),
    markSportFetched: (sport) =>
        set((state) => ({
            fetchedSports: state.fetchedSports.includes(sport)
                ? state.fetchedSports
                : [...state.fetchedSports, sport],
        })),
    reset: () => set(INITIAL),
}));
