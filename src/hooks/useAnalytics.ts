import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  KPIOverview,
  ChartDataPoint,
  SportBreakdown,
  MarketBreakdown,
  MonthlyTrend,
  TimeOfDayData,
  LeaguePerformance,
  StakingPerformance,
  OddsPerformance,
} from "@/lib/contracts/ui.contract";
import type { BetRecord } from "@/lib/contracts/db.contract";
import { getBets } from "@/lib/db/repositories/bet.repository";
import { getOutcomesByBetId } from "@/lib/db/repositories/outcome.repository";
import {
  getKPIOverview,
  getProfitOverTime,
  getSportBreakdown,
  getMarketBreakdown,
  getMonthlyTrend,
  getTimeOfDayAnalysis,
  getLeaguePerformance,
  getStakingPerformance,
  getOddsPerformance,
  getDailyDeltas,
  getSharpeRatio,
  type OutcomeInfo,
} from "@/lib/analytics/aggregator";
import { exportToCSV, exportToJSON, downloadFile } from "@/lib/analytics/export";

interface AnalyticsData {
  rawBets: BetRecord[];
  outcomeMap: Map<string, OutcomeInfo[]>;
}

async function fetchAnalytics(
  dateFrom: Date | null,
  dateTo: Date | null,
): Promise<AnalyticsData> {
  const dbBets = await getBets({
    limit: 1000,
    dateFrom: dateFrom ? Math.floor(dateFrom.getTime() / 1000) : undefined,
    dateTo: dateTo ? Math.floor(dateTo.getTime() / 1000) : undefined,
  });

  const om = new Map<string, OutcomeInfo[]>();
  await Promise.all(
    dbBets.map(async (bet) => {
      const outcomes = await getOutcomesByBetId(bet.id);
      om.set(
        bet.id,
        outcomes.map((o) => ({
          marketName: o.marketName,
          fixtureName: o.fixtureName,
          fixtureSlug: o.fixtureSlug,
        })),
      );
    }),
  );

  return { rawBets: dbBets, outcomeMap: om };
}

export function useAnalytics() {
  const [dateRange, setDateRange] = useState<{
    from: Date | null;
    to: Date | null;
  }>({ from: null, to: null });

  // Serialize dates for stable query key
  const dateKey = useMemo(
    () => ({
      from: dateRange.from?.getTime() ?? null,
      to: dateRange.to?.getTime() ?? null,
    }),
    [dateRange.from, dateRange.to],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", dateKey],
    queryFn: () => fetchAnalytics(dateRange.from, dateRange.to),
    staleTime: 60_000,
    refetchInterval: 120_000, // Re-check every 2 min for settled bets
    // Analytics are non-critical — silently handle errors
    throwOnError: false,
  });

  const rawBets = data?.rawBets ?? [];
  const outcomeMap = data?.outcomeMap ?? new Map<string, OutcomeInfo[]>();

  // Default 30-day range for chart axes
  const chartFrom = useMemo(() => {
    if (dateRange.from) return dateRange.from;
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, [dateRange.from]);

  const chartTo = useMemo(() => {
    return dateRange.to ?? new Date();
  }, [dateRange.to]);

  // ─── Derived analytics (memoized) ───

  const kpi = useMemo<KPIOverview>(
    () => getKPIOverview(rawBets, dateRange.from, dateRange.to),
    [rawBets, dateRange.from, dateRange.to],
  );

  const profitData = useMemo<ChartDataPoint[]>(
    () => getProfitOverTime(rawBets, chartFrom, chartTo, "day"),
    [rawBets, chartFrom, chartTo],
  );

  const sportBreakdown = useMemo<SportBreakdown[]>(
    () => getSportBreakdown(rawBets, dateRange.from, dateRange.to),
    [rawBets, dateRange.from, dateRange.to],
  );

  const marketBreakdown = useMemo<MarketBreakdown[]>(
    () => getMarketBreakdown(rawBets, outcomeMap, dateRange.from, dateRange.to),
    [rawBets, outcomeMap, dateRange.from, dateRange.to],
  );

  const monthlyTrend = useMemo<MonthlyTrend[]>(
    () => getMonthlyTrend(rawBets, dateRange.from, dateRange.to),
    [rawBets, dateRange.from, dateRange.to],
  );

  const timeOfDay = useMemo<TimeOfDayData[]>(
    () => getTimeOfDayAnalysis(rawBets, dateRange.from, dateRange.to),
    [rawBets, dateRange.from, dateRange.to],
  );

  const leaguePerformance = useMemo<LeaguePerformance[]>(
    () => getLeaguePerformance(rawBets, outcomeMap, dateRange.from, dateRange.to),
    [rawBets, outcomeMap, dateRange.from, dateRange.to],
  );

  const stakingPerformance = useMemo<StakingPerformance[]>(() => {
    // Use betType as a proxy for staking mode name
    const presetNames = new Map<string, string>();
    const types = new Set(rawBets.map((b) => b.betType));
    for (const t of types) presetNames.set(t, t.charAt(0).toUpperCase() + t.slice(1));
    return getStakingPerformance(rawBets, presetNames, dateRange.from, dateRange.to);
  }, [rawBets, dateRange.from, dateRange.to]);

  const oddsPerformance = useMemo<OddsPerformance[]>(
    () => getOddsPerformance(rawBets, dateRange.from, dateRange.to),
    [rawBets, dateRange.from, dateRange.to],
  );

  const dailyDeltas = useMemo<ChartDataPoint[]>(
    () => getDailyDeltas(rawBets, chartFrom, chartTo),
    [rawBets, chartFrom, chartTo],
  );

  const sharpeRatio = useMemo<number>(
    () => getSharpeRatio(rawBets, chartFrom, chartTo),
    [rawBets, chartFrom, chartTo],
  );

  // ─── Export ───

  const exportData = useCallback(
    (format: "csv" | "json") => {
      const ts = new Date().toISOString().split("T")[0];
      if (format === "csv") {
        const csv = exportToCSV(rawBets, {
          dateFrom: dateRange.from ?? undefined,
          dateTo: dateRange.to ?? undefined,
        });
        downloadFile(csv, `bets-export-${ts}.csv`, "text/csv");
      } else {
        const json = exportToJSON(rawBets);
        downloadFile(json, `bets-export-${ts}.json`, "application/json");
      }
    },
    [rawBets, dateRange.from, dateRange.to],
  );

  return {
    kpi,
    profitData,
    dailyDeltas,
    sportBreakdown,
    marketBreakdown,
    monthlyTrend,
    timeOfDay,
    leaguePerformance,
    stakingPerformance,
    oddsPerformance,
    sharpeRatio,
    isLoading,
    dateRange,
    setDateRange,
    exportData,
  };
}
