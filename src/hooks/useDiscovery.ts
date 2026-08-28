/**
 * Discovery hook — fetches real fixture data from the Stake GraphQL API.
 * Maps API market/outcome data to UI BetTypeInfo format.
 * Enhanced with client-side date filtering, pagination, and fixture detail loading.
 * Keeps identical function signature for DiscoveryPage compatibility.
 * @module hooks/useDiscovery
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { DiscoveryFilters, DiscoveryFixture, BetTypeInfo } from "@/lib/contracts/ui.contract";
import { getBetTypeById, getGroupForBetType, getLinesForBetType, getPopularBetTypes, extractLine, BET_TYPES, getBetTypesForSport } from "@/lib/utils/bet-type-mapper";
import { getSportIndex, getFixtureDetailsQuery, type SportIndexData, type FixtureDetailsData } from "@/lib/stake-api/queries";
import { useSettingsStore } from "@/store/useSettingsStore";
import { classifyError, getUserFriendlyMessage } from "@/lib/stake-api/errors";
import type { StakeFixture, StakeMarket, StakeMarketOutcome } from "@/lib/contracts/api.contract";
import { PAGE_SIZE } from "@/components/discovery/types";

// ─── Default Filters ────────────────────────────────────────────────────────

const DEFAULT_FILTERS: DiscoveryFilters = {
  sport: "soccer",
  betType: "corners-over-under",
  betTypeLine: "9.5",
  group: "corners",
  dateFrom: null,
  dateTo: null,
  tournamentSlugs: [],
  searchQuery: "",
};

// ─── Date Filtering Helpers ─────────────────────────────────────────────────

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfToday(): number {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function startOfTomorrow(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfTomorrow(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function nextSaturdayStart(): number {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSat = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSat);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function nextSundayEnd(): number {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSun = (7 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSun);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function getDateRangeForPreset(preset: string): { dateFrom: number; dateTo: number } | null {
  const now = Date.now();
  switch (preset) {
    case "today":
      return { dateFrom: startOfToday(), dateTo: endOfToday() };
    case "tomorrow":
      return { dateFrom: startOfTomorrow(), dateTo: endOfTomorrow() };
    case "weekend":
      return { dateFrom: nextSaturdayStart(), dateTo: nextSundayEnd() };
    case "next7":
      return { dateFrom: now, dateTo: now + 7 * 24 * 60 * 60 * 1000 };
    case "next30":
      return { dateFrom: now, dateTo: now + 30 * 24 * 60 * 60 * 1000 };
    default:
      return null;
  }
}

// ─── Mapping: StakeFixture → DiscoveryFixture ──────────────────────────────

function mapFixtureToDiscovery(
  fixture: StakeFixture,
  betType: string | null,
  betTypeLine: string | null,
  cachedMarkets?: StakeMarket[],
): DiscoveryFixture {
  const data = fixture.data;
  const isMatch = data?.__typename === "SportFixtureDataMatch";
  const competitors = isMatch && "competitors" in data
    ? data.competitors.map((c) => ({ name: c.name, iconPath: c.iconPath }))
    : [];
  const startTime = isMatch && "startTime" in data
    ? data.startTime
    : data?.__typename === "SportFixtureDataOutright" && "startTime" in data
      ? data.startTime
      : "";

  const isLive = fixture.status === "in_progress" || fixture.status === "live";
  const eventStatus = fixture.eventStatus;

  // Use cached markets (from fixture details) or fixture's own markets if available
  const markets = cachedMarkets ?? fixture.markets ?? [];

  // Build previewMarkets from actual API market data
  const previewMarkets = markets.slice(0, 6).map((m) => ({
    name: m.name,
    outcomes: m.outcomes.map((o) => ({ name: o.name, odds: o.odds, active: o.active })),
  }));

  // Build a fixture-like object with markets for bet type matching
  const fixtureWithMarkets = { ...fixture, markets };

  return {
    id: fixture.id,
    name: fixture.name,
    slug: fixture.slug,
    startTime,
    status: fixture.status,
    isLive,
    homeScore: eventStatus?.homeScore,
    awayScore: eventStatus?.awayScore,
    tournament: {
      name: fixture.tournament?.name ?? "Unknown",
      category: { name: fixture.tournament?.category?.name ?? "Unknown" },
    },
    competitors,
    previewMarkets,
    betTypeInfo: betType ? computeBetTypeInfo(fixtureWithMarkets, betType, betTypeLine) : undefined,
  };
}

// ─── Compute BetTypeInfo from API market data ──────────────────────────────

function computeBetTypeInfo(
  fixture: StakeFixture,
  betTypeId: string,
  betTypeLine: string | null,
): BetTypeInfo {
  const betType = getBetTypeById(betTypeId);
  if (!betType) return { betTypeName: "", line: betTypeLine, available: false };

  const matchingOutcomes = findMatchingOutcomes(fixture, betType.templates, betTypeLine);

  if (matchingOutcomes.length > 0) {
    return buildBetTypeInfoFromOutcomes(betTypeId, betType, betTypeLine, matchingOutcomes);
  }

  return { betTypeName: betType.name, line: betTypeLine, available: false };
}

/**
 * Search through a fixture's markets for ones whose name matches any of the
 * bet-type templates. For line-based bet types, also checks the line value
 * extracted from the market name matches the requested line.
 */
function findMatchingOutcomes(
  fixture: StakeFixture,
  templates: string[],
  line: string | null,
): StakeMarketOutcome[] {
  const markets = fixture.markets ?? [];
  if (markets.length === 0) return [];

  const matchingOutcomes: StakeMarketOutcome[] = [];

  for (const market of markets) {
    if (market.status !== "active") continue;

    const marketName = market.name.toLowerCase();

    // Check if any template matches this market name
    const templateMatch = templates.some(
      (t) => marketName.includes(t.toLowerCase()),
    );
    if (!templateMatch) continue;

    // For line-based bet types, verify the line value matches
    if (line) {
      const marketLine = extractLine(market.name);
      if (marketLine && marketLine !== line) continue;
    }

    matchingOutcomes.push(...market.outcomes);
  }

  return matchingOutcomes;
}

function buildBetTypeInfoFromOutcomes(
  betTypeId: string,
  betType: ReturnType<typeof getBetTypeById> & object,
  line: string | null,
  outcomes: StakeMarketOutcome[],
): BetTypeInfo {
  const activeOutcomes = outcomes.filter((o) => o.active);

  if (betType.hasLines && line) {
    const overOutcome = activeOutcomes.find((o) => o.name.toLowerCase().includes("over"));
    const underOutcome = activeOutcomes.find((o) => o.name.toLowerCase().includes("under"));

    if (overOutcome && underOutcome) {
      return {
        betTypeName: betType.name,
        line,
        overOutcome: { id: overOutcome.id, name: overOutcome.name, odds: overOutcome.odds, active: overOutcome.active },
        underOutcome: { id: underOutcome.id, name: underOutcome.name, odds: underOutcome.odds, active: underOutcome.active },
        available: true,
      };
    }
  }

  if (!betType.hasLines && activeOutcomes.length > 0) {
    if (activeOutcomes.length <= 3) {
      return {
        betTypeName: betType.name,
        line,
        allOutcomes: activeOutcomes.map((o) => ({ id: o.id, name: o.name, odds: o.odds, active: o.active })),
        available: true,
      };
    }
    const first = activeOutcomes[0];
    return {
      betTypeName: betType.name,
      line,
      singleOutcome: { id: first.id, name: first.name, odds: first.odds, active: first.active },
      available: true,
    };
  }

  return { betTypeName: betType.name, line, available: false };
}

// ─── Main Hook ──────────────────────────────────────────────────────────────

export function useDiscovery(initialSport?: string, externalTournamentSlugs?: string[]) {
  const [filters, setFiltersState] = useState<DiscoveryFilters>({
    ...DEFAULT_FILTERS,
    ...(initialSport ? { sport: initialSport } : {}),
  });
  const [rawFixtures, setRawFixtures] = useState<StakeFixture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Array<{ name: string; slug: string; category: { name: string } }>>([]);
  const [page, setPage] = useState(1);
  const [fixtureDetails, setFixtureDetails] = useState<FixtureDetailsData | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  // Cache of markets fetched via fixture details, keyed by fixture ID
  const [marketsCache, setMarketsCache] = useState<Map<string, StakeMarket[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const detailsAbortRef = useRef<AbortController | null>(null);
  const detailFetchAbortRef = useRef<AbortController | null>(null);
  const apiToken = useSettingsStore((s) => s.apiToken);

  // Sync sport from parent (SideNav) when it changes; reset betType if not available for new sport
  useEffect(() => {
    if (initialSport) {
      setFiltersState((prev) => {
        if (prev.sport === initialSport) return prev;
        const available = getBetTypesForSport(initialSport);
        const betTypeStillValid = prev.betType && available.some((b) => b.id === prev.betType);
        return {
          ...prev,
          sport: initialSport,
          betType: betTypeStillValid ? prev.betType : null,
          betTypeLine: betTypeStillValid ? prev.betTypeLine : null,
        };
      });
    }
  }, [initialSport]);

  // Sync tournament slugs from parent (SideNav) when they change
  useEffect(() => {
    if (externalTournamentSlugs) {
      setFiltersState((prev) => {
        const sorted = [...externalTournamentSlugs].sort().join(",");
        const prevSorted = [...prev.tournamentSlugs].sort().join(",");
        if (sorted === prevSorted) return prev;
        return { ...prev, tournamentSlugs: externalTournamentSlugs };
      });
    }
  }, [externalTournamentSlugs]);

  // ─── Fetch fixtures from API ────────────────────────────────────────────

  const fetchFixtures = useCallback(async (sport: string, group: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getSportIndex(sport, group, "popular", 1);

      if (controller.signal.aborted) return;

      const allFixtures: StakeFixture[] = [];
      const allTournaments: typeof tournaments = [];

      for (const category of data.sport.categories) {
        for (const tournament of category.tournaments) {
          allTournaments.push({
            name: tournament.name,
            slug: tournament.slug,
            category: { name: category.name },
          });
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

      setRawFixtures(allFixtures);
      setTournaments(allTournaments);
      setMarketsCache(new Map()); // Clear market cache when sport/group changes
    } catch (err) {
      if (controller.signal.aborted) return;
      const errType = classifyError(err);
      setError(getUserFriendlyMessage(errType));
      setRawFixtures([]);
      setTournaments([]);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  // Auto-fetch when filters change (sport/group)
  useEffect(() => {
    if (apiToken) {
      fetchFixtures(filters.sport, filters.group);
    }
    return () => abortRef.current?.abort();
  }, [filters.sport, filters.group, apiToken, fetchFixtures]);

  // ─── Filter updater ─────────────────────────────────────────────────────

  const updateFilters = useCallback((partial: Partial<DiscoveryFilters>) => {
    setFiltersState((prev) => {
      const next = { ...prev, ...partial };
      if (partial.betType !== undefined) {
        next.group = getGroupForBetType(partial.betType ?? "");
        if (partial.betTypeLine === undefined) {
          const lines = getLinesForBetType(partial.betType ?? "");
          next.betTypeLine = lines[1] ?? lines[0] ?? null;
        }
      }
      return next;
    });
    setPage(1); // Reset to page 1 when filters change
  }, []);

  // ─── Derived fixtures with BetTypeInfo ──────────────────────────────────

  const fixtures = useMemo(() => {
    return rawFixtures.map((f) =>
      mapFixtureToDiscovery(f, filters.betType, filters.betTypeLine, marketsCache.get(f.id)),
    );
  }, [rawFixtures, filters.betType, filters.betTypeLine, marketsCache]);

  // ─── Client-side date + search + tournament filtering ───────────────────

  const filteredFixtures = useMemo(() => {
    let list = fixtures;

    // Date filtering (client-side)
    if (filters.dateFrom !== null || filters.dateTo !== null) {
      list = list.filter((f) => {
        const t = new Date(f.startTime).getTime();
        if (filters.dateFrom !== null && t < filters.dateFrom) return false;
        if (filters.dateTo !== null && t > filters.dateTo) return false;
        return true;
      });
    }

    // Search query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.tournament.name.toLowerCase().includes(q) ||
          f.tournament.category.name.toLowerCase().includes(q) ||
          f.competitors.some((c) => c.name.toLowerCase().includes(q)),
      );
    }

    // Tournament filter
    if (filters.tournamentSlugs.length) {
      list = list.filter((f) =>
        filters.tournamentSlugs.includes(f.tournament.name),
      );
    }

    // Bet type filter: only show fixtures that have the selected bet type available
    if (filters.betType) {
      list = list.filter((f) => f.betTypeInfo?.available === true);
    }

    // Sort by startTime ascending
    list.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return list;
  }, [fixtures, filters.dateFrom, filters.dateTo, filters.searchQuery, filters.tournamentSlugs, filters.betType]);

  // ─── Pagination ─────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filteredFixtures.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedFixtures = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredFixtures.slice(start, start + PAGE_SIZE);
  }, [filteredFixtures, safePage]);

  // ─── Background: fetch fixture details for visible page ────────────────
  // The discovery query can't include markets (geo-restricted), so we fetch
  // fixture details in the background to populate bet type data.
  useEffect(() => {
    if (rawFixtures.length === 0 || !apiToken) return;

    // Get fixtures on the current page that we haven't fetched yet
    const start = (safePage - 1) * PAGE_SIZE;
    const unfetched = filteredFixtures.slice(start, start + PAGE_SIZE)
      .filter((f) => !marketsCache.has(f.id));

    if (unfetched.length === 0) return;

    detailFetchAbortRef.current?.abort();
    const controller = new AbortController();
    detailFetchAbortRef.current = controller;

    let cancelled = false;

    (async () => {
      // Fetch details sequentially to avoid rate limiting
      for (const fixture of unfetched) {
        if (cancelled || controller.signal.aborted) break;
        try {
          // Auto-discovers all available groups from the API
          const details = await getFixtureDetailsQuery(fixture.slug);
          if (cancelled || controller.signal.aborted) break;
          // Extract markets from marketGroups → templates → markets
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
        } catch {
          // Silently skip — fixture details may fail for some fixtures
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [filteredFixtures, safePage, rawFixtures.length, apiToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Line odds preview (for BetTypeLineSelector) ────────────────────────

  const lineOddsPreview = useMemo(() => {
    if (!filters.betType) return {};
    const lines = getLinesForBetType(filters.betType);
    const preview: Record<string, { over: number; under: number }> = {};
    for (const line of lines) {
      preview[line] = { over: 0, under: 0 };
    }
    return preview;
  }, [filters.betType]);

  // ─── Derived bet type data ──────────────────────────────────────────────

  const activeBetType = filters.betType ? getBetTypeById(filters.betType) ?? null : null;
  const popularBetTypes = getPopularBetTypes();

  // ─── Fixture detail loading ─────────────────────────────────────────────

  const loadFixtureDetails = useCallback(async (fixtureId: string) => {
    detailsAbortRef.current?.abort();
    const controller = new AbortController();
    detailsAbortRef.current = controller;

    setIsLoadingDetails(true);
    setDetailsError(null);

    try {
      const data = await getFixtureDetailsQuery(fixtureId);
      if (!controller.signal.aborted) {
        setFixtureDetails(data);
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const errType = classifyError(err);
        setDetailsError(getUserFriendlyMessage(errType));
        setFixtureDetails(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingDetails(false);
      }
    }
  }, []);

  const clearFixtureDetails = useCallback(() => {
    detailsAbortRef.current?.abort();
    setFixtureDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
  }, []);

  // ─── Return ─────────────────────────────────────────────────────────────

  return {
    filters,
    setFilters: updateFilters,
    fixtures: paginatedFixtures,
    allFixtures: fixtures,
    filteredCount: filteredFixtures.length,
    isLoading,
    error,
    betTypes: BET_TYPES,
    popularBetTypes,
    activeBetType,
    lineOddsPreview,
    tournaments,
    page: safePage,
    totalPages,
    setPage,
    fixtureDetails,
    isLoadingDetails,
    detailsError,
    loadFixtureDetails,
    clearFixtureDetails,
    refetch: () => fetchFixtures(filters.sport, filters.group),
  };
}
