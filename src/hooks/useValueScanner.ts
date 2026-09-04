/**
 * useValueScanner — fetches fixtures, loads market data, and identifies odds gaps.
 * State is persisted in useScannerStore so results survive tab switches.
 * Only refetches when sport changes or user hits refresh.
 * Full error handling at every layer: structured logging, toast notifications,
 * per-fixture resilience, and retry support.
 * @module hooks/useValueScanner
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import type { StakeFixture, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import type { DiscoveryFixture } from "@/lib/contracts/ui.contract";
import {
    getSportIndex,
    getFixtureDetailsQuery,
} from "@/lib/stake-api";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useUIStore } from "@/store/useUIStore";
import { useScannerStore } from "@/store/useScannerStore";
import {
    buildScannerErrorContext,
    isRetryable,
    type ScannerFilters,
    type FixtureFailure,
} from "@/lib/scanner/errors";
import type { FlaggedMarket } from "@/components/scanner/ScannerResultRow";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FlaggedResult {
    fixture: DiscoveryFixture;
    flaggedMarkets: FlaggedMarket[];
}

export type ScannerPhase = "idle" | "fetching" | "enriching" | "analyzing";

interface UseValueScannerReturn {
    flaggedResults: FlaggedResult[];
    failedFixtures: FixtureFailure[];
    isLoading: boolean;
    phase: ScannerPhase;
    error: string | null;
    totalFixtures: number;
    totalFlaggedMarkets: number;
    availableMarketNames: string[];
    refetch: () => void;
}

// ─── Mapping Helper ─────────────────────────────────────────────────────────

function mapToDiscoveryFixture(fixture: StakeFixture): DiscoveryFixture {
    const data = fixture.data;
    const isMatch = data?.__typename === "SportFixtureDataMatch";
    const competitors =
        isMatch && "competitors" in data
            ? data.competitors.map((c) => ({ name: c.name, iconPath: c.iconPath }))
            : [];
    const startTime =
        isMatch && "startTime" in data
            ? data.startTime
            : data?.__typename === "SportFixtureDataOutright" && "startTime" in data
                ? data.startTime
                : "";

    const sportSlug = fixture.tournament?.category?.sport?.slug;
    const catSlug = fixture.tournament?.category?.slug;
    const tourSlug = fixture.tournament?.slug;
    const stakeUrl =
        sportSlug && catSlug && tourSlug && fixture.slug
            ? `https://stake.com/sports/${sportSlug}/${catSlug}/${tourSlug}/${fixture.slug}`
            : undefined;

    const competitorFallback =
        competitors.length >= 2
            ? `${competitors[0].name} vs ${competitors[1].name}`
            : fixture.name || "Unscheduled";

    return {
        id: fixture.id,
        name: fixture.name,
        slug: fixture.slug,
        startTime,
        status: fixture.status,
        isLive: fixture.status === "in_progress" || fixture.status === "live",
        homeScore: fixture.eventStatus?.homeScore,
        awayScore: fixture.eventStatus?.awayScore,
        tournament: {
            name: fixture.tournament?.name ?? competitorFallback,
            slug: fixture.tournament?.slug,
            category: {
                name: fixture.tournament?.category?.name ?? (sportSlug ?? "Other"),
                slug: fixture.tournament?.category?.slug,
            },
        },
        competitors,
        previewMarkets: [],
        sport: sportSlug,
        stakeUrl,
    };
}

// ─── Odds Gap Analysis ──────────────────────────────────────────────────────

function analyzeMarketGap(market: StakeMarket): FlaggedMarket | null {
    const activeOutcomes = market.outcomes.filter(
        (o: StakeMarketOutcome) => o.active && o.odds > 0,
    );
    if (activeOutcomes.length < 2) return null;

    const sorted = [...activeOutcomes].sort((a, b) => a.odds - b.odds);
    const minOutcome = sorted[0];
    const maxOutcome = sorted[sorted.length - 1];

    if (minOutcome.odds <= 0) return null;

    const gapRatio = maxOutcome.odds / minOutcome.odds;

    return {
        market,
        gapRatio,
        minOdds: minOutcome.odds,
        maxOdds: maxOutcome.odds,
        minOutcome,
        maxOutcome,
    };
}

// ─── Main Hook ──────────────────────────────────────────────────────────────

export function useValueScanner(
    sport: string,
    minGapRatio: number,
    outcomeCount: number | null,
    dateFrom: number | null,
    dateTo: number | null,
    marketType: string = "",
): UseValueScannerReturn {
    const apiToken = useSettingsStore((s) => s.apiToken);
    const addToast = useUIStore((s) => s.addToast);

    // Read from persistent store
    const rawFixtures = useScannerStore((s) => s.rawFixtures);
    const marketsCache = useScannerStore((s) => s.marketsCache);
    const failedFixtures = useScannerStore((s) => s.failedFixtures);
    const isLoading = useScannerStore((s) => s.isLoading);
    const phase = useScannerStore((s) => s.phase);
    const error = useScannerStore((s) => s.error);
    const lastSport = useScannerStore((s) => s.lastSport);
    const fetchedSports = useScannerStore((s) => s.fetchedSports);

    // Store actions
    const setRawFixtures = useScannerStore((s) => s.setRawFixtures);
    const setMarketsCache = useScannerStore((s) => s.setMarketsCache);
    const appendFailedFixtures = useScannerStore((s) => s.appendFailedFixtures);
    const setIsLoading = useScannerStore((s) => s.setIsLoading);
    const setPhase = useScannerStore((s) => s.setPhase);
    const setError = useScannerStore((s) => s.setError);
    const setLastSport = useScannerStore((s) => s.setLastSport);
    const markSportFetched = useScannerStore((s) => s.markSportFetched);
    const reset = useScannerStore((s) => s.reset);

    // Store current filter values for error context
    const filtersRef = useRef<ScannerFilters>({
        sport,
        minGapRatio,
        outcomeCount,
        dateFrom,
        dateTo,
        marketType,
    });
    filtersRef.current = { sport, minGapRatio, outcomeCount, dateFrom, dateTo, marketType };

    const abortRef = useRef<AbortController | null>(null);
    const detailAbortRef = useRef<AbortController | null>(null);
    const fetchingRef = useRef<Set<string>>(new Set());

    // ─── Fetch fixtures ─────────────────────────────────────────────────────

    const fetchFixtures = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setIsLoading(true);
        setPhase("fetching");
        setError(null);
        useScannerStore.getState().failedFixtures.length = 0;
        useScannerStore.setState({ failedFixtures: [] });

        try {
            const data = await getSportIndex(sport, "popular", "popular", 1);

            if (controller.signal.aborted) return;

            const allFixtures: StakeFixture[] = [];
            for (const category of data.sport.categories) {
                for (const tournament of category.tournaments) {
                    for (const fixture of tournament.fixtures) {
                        allFixtures.push({
                            ...fixture,
                            tournament: {
                                id: tournament.id,
                                name: tournament.name,
                                slug: tournament.slug,
                                category: {
                                    id: category.id,
                                    name: category.name,
                                    slug: category.slug,
                                    sport: {
                                        id: data.sport.id,
                                        name: data.sport.name,
                                        slug: data.sport.slug,
                                    },
                                },
                            },
                        });
                    }
                }
            }

            // Only keep fixtures that haven't started yet (filter by startTime)
            const now = Date.now();
            const upcoming = allFixtures.filter((f) => {
                const data = f.data;
                const startTime =
                    data?.__typename === "SportFixtureDataMatch" && "startTime" in data
                        ? data.startTime
                        : data?.__typename === "SportFixtureDataOutright" && "startTime" in data
                            ? data.startTime
                            : null;
                if (!startTime) return false;
                return new Date(startTime).getTime() > now;
            });

            setRawFixtures(upcoming);
            setMarketsCache(() => new Map());
            setLastSport(sport);
            fetchingRef.current = new Set();

            if (upcoming.length === 0) {
                setPhase("idle");
                setIsLoading(false);
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            const ctx = buildScannerErrorContext(
                err,
                "fetch-fixtures",
                sport,
                filtersRef.current,
            );
            setError(ctx.userMessage);
            setRawFixtures([]);
            setPhase("idle");
            setIsLoading(false);

            addToast({
                type: "error",
                title: ctx.userMessage,
                description: `Failed to fetch ${sport} fixtures`,
                duration: 6000,
                action: isRetryable(ctx.classified)
                    ? { label: "Retry", onClick: () => fetchFixtures() }
                    : undefined,
            });
        }
    }, [sport, addToast, setRawFixtures, setMarketsCache, setIsLoading, setPhase, setError, setLastSport]);

    // Auto-fetch: only if no data yet or sport changed
    useEffect(() => {
        if (!apiToken) return;

        // Skip if we already fetched for this sport in this session (persisted in store)
        const alreadyFetched = fetchedSports.includes(sport) && rawFixtures.length > 0;
        if (alreadyFetched) {
            if (phase !== "analyzing") {
                setPhase("analyzing");
                setIsLoading(false);
            }
            return;
        }

        markSportFetched(sport);
        fetchFixtures();
        return () => abortRef.current?.abort();
    }, [sport, apiToken]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Enrich: fetch fixture details sequentially ───────────────────────

    useEffect(() => {
        if (rawFixtures.length === 0 || !apiToken) return;

        const unfetched = rawFixtures.filter(
            (f) => !marketsCache.has(f.id) && !fetchingRef.current.has(f.id),
        );
        if (unfetched.length === 0) {
            // All fetched — move to analyzing
            if (phase !== "analyzing") {
                setPhase("analyzing");
                setIsLoading(false);
            }
            return;
        }

        setPhase("enriching");

        detailAbortRef.current?.abort();
        const controller = new AbortController();
        detailAbortRef.current = controller;

        let cancelled = false;
        const newFailures: FixtureFailure[] = [];

        (async () => {
            for (const fixture of unfetched) {
                if (cancelled || controller.signal.aborted) break;
                fetchingRef.current.add(fixture.id);

                try {
                    const details = await getFixtureDetailsQuery(fixture.slug);
                    if (cancelled || controller.signal.aborted) break;

                    const markets = details.marketGroups.flatMap((g) =>
                        g.templates.flatMap((t) => t.markets),
                    );
                    if (markets.length > 0) {
                        setMarketsCache((prev) => {
                            const next = new Map(prev);
                            next.set(fixture.id, markets);
                            return next;
                        });
                    }
                } catch (err) {
                    if (cancelled || controller.signal.aborted) break;

                    // Per-fixture resilience: log and skip
                    const ctx = buildScannerErrorContext(
                        err,
                        "fetch-details",
                        sport,
                        filtersRef.current,
                        fixture.id,
                        fixture.slug,
                    );

                    newFailures.push({
                        fixtureId: fixture.id,
                        fixtureSlug: fixture.slug,
                        phase: "fetch-details",
                        error: ctx.userMessage,
                        timestamp: Date.now(),
                    });
                }
            }

            if (!cancelled) {
                if (newFailures.length > 0) {
                    appendFailedFixtures(newFailures);
                    addToast({
                        type: "warning",
                        title: `${newFailures.length} fixture${newFailures.length !== 1 ? "s" : ""} failed to load`,
                        description: "Showing results for successfully loaded fixtures",
                        duration: 4000,
                    });
                }
                setPhase("analyzing");
                setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [rawFixtures, apiToken]); // eslint-disable-line react-hooks/exhaustive-deps

    // ─── Analyze: compute flagged results ─────────────────────────────────

    const flaggedResults = useMemo(() => {
        if (phase !== "analyzing" && marketsCache.size === 0) return [];

        const results: FlaggedResult[] = [];

        const now = Date.now();

        for (const fixture of rawFixtures) {
            // Skip failed fixtures
            if (failedFixtures.some((f) => f.fixtureId === fixture.id)) continue;

            // Date filtering
            const data = fixture.data;
            const isMatch = data?.__typename === "SportFixtureDataMatch";
            const startTime =
                isMatch && "startTime" in data
                    ? data.startTime
                    : data?.__typename === "SportFixtureDataOutright" && "startTime" in data
                        ? data.startTime
                        : "";

            if (startTime) {
                const t = new Date(startTime).getTime();
                // Skip fixtures that have already started (live or past)
                if (t <= now) continue;
                if (dateFrom !== null && t < dateFrom) continue;
                if (dateTo !== null && t > dateTo) continue;
            }

            const markets = marketsCache.get(fixture.id);
            if (!markets || markets.length === 0) continue;

            const flaggedMarkets: FlaggedMarket[] = [];

            for (const market of markets) {
                if (market.status !== "active") continue;

                // Market type filter
                if (marketType !== "" && market.name !== marketType) continue;

                const activeOutcomes = market.outcomes.filter(
                    (o: StakeMarketOutcome) => o.active,
                );

                // Outcome count filter
                if (outcomeCount !== null) {
                    if (outcomeCount === 5) {
                        // "5+" means 5 or more
                        if (activeOutcomes.length < 5) continue;
                    } else {
                        if (activeOutcomes.length !== outcomeCount) continue;
                    }
                }

                // Gap analysis
                const gapResult = analyzeMarketGap(market);
                if (gapResult && gapResult.gapRatio >= minGapRatio) {
                    flaggedMarkets.push(gapResult);
                }
            }

            if (flaggedMarkets.length > 0) {
                // Sort markets by gap ratio descending
                flaggedMarkets.sort((a, b) => b.gapRatio - a.gapRatio);

                results.push({
                    fixture: mapToDiscoveryFixture(fixture),
                    flaggedMarkets,
                });
            }
        }

        // Sort fixtures by best gap ratio descending
        results.sort(
            (a, b) =>
                Math.max(...b.flaggedMarkets.map((m) => m.gapRatio)) -
                Math.max(...a.flaggedMarkets.map((m) => m.gapRatio)),
        );

        return results;
    }, [rawFixtures, marketsCache, failedFixtures, phase, minGapRatio, outcomeCount, dateFrom, dateTo, marketType]);

    // ─── Available market names (computed from flagged results) ──────────
    // Only shows market types that have at least one flagged market.
    // Excludes team-specific names (e.g. "Over 2.5 Goals - Arsenal") by
    // filtering out any market name that contains a competitor name.

    const availableMarketNames = useMemo(() => {
        // Collect all competitor names across fixtures
        const teamNames = new Set<string>();
        for (const f of rawFixtures) {
            const data = f.data;
            const isMatch = data?.__typename === "SportFixtureDataMatch";
            if (isMatch && "competitors" in data) {
                for (const c of data.competitors) {
                    if (c.name) teamNames.add(c.name.toLowerCase());
                }
            }
        }

        const names = new Set<string>();
        for (const result of flaggedResults) {
            for (const fm of result.flaggedMarkets) {
                const lower = fm.market.name.toLowerCase();
                const isTeamSpecific = [...teamNames].some((t) => lower.includes(t));
                if (!isTeamSpecific) names.add(fm.market.name);
            }
        }
        return [...names].sort();
    }, [flaggedResults, rawFixtures]);

    // ─── Stats ────────────────────────────────────────────────────────────

    const totalFixtures = rawFixtures.length;
    const totalFlaggedMarkets = flaggedResults.reduce(
        (sum, r) => sum + r.flaggedMarkets.length,
        0,
    );

    // ─── Toast on successful analysis ─────────────────────────────────────

    const prevPhaseRef = useRef<ScannerPhase>("idle");
    useEffect(() => {
        if (prevPhaseRef.current === "analyzing" && phase === "analyzing" && flaggedResults.length > 0) {
            addToast({
                type: "success",
                title: `Found ${totalFlaggedMarkets} flagged market${totalFlaggedMarkets !== 1 ? "s" : ""} across ${flaggedResults.length} fixture${flaggedResults.length !== 1 ? "s" : ""}`,
                duration: 3000,
            });
        }
        prevPhaseRef.current = phase;
    }, [phase, flaggedResults.length, totalFlaggedMarkets, addToast]);

    return {
        flaggedResults,
        failedFixtures,
        isLoading,
        phase,
        error,
        totalFixtures,
        totalFlaggedMarkets,
        availableMarketNames,
        refetch: fetchFixtures,
    };
}
