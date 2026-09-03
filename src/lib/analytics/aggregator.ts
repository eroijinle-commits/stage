import type { BetRecord } from "@/lib/contracts/db.contract";
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
import {
  calculateROI,
  calculateYield,
  calculateWinRate,
  calculateAvgOdds,
  calculateProfitPerBet,
  calculateSharpeRatio,
} from "./calculator";

// ─── Outcome context (lightweight) ───

export interface OutcomeInfo {
  marketName: string;
  fixtureName: string;
  fixtureSlug: string;
}

// ─── Helpers ───

function isSettled(bet: BetRecord): boolean {
  return bet.status !== "pending" && bet.status !== "cancelled";
}

function betProfit(bet: BetRecord): number {
  if (bet.status === "won") {
    return Math.round(bet.amount * (bet.payoutMultiplier ?? bet.totalOdds)) - bet.amount;
  }
  if (bet.status === "lost") return -bet.amount;
  return 0;
}

function betReturn(bet: BetRecord): number {
  if (bet.status === "won") {
    return Math.round(bet.amount * (bet.payoutMultiplier ?? bet.totalOdds));
  }
  return 0;
}

function filterByDateRange(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): BetRecord[] {
  const from = dateFrom ? Math.floor(dateFrom.getTime() / 1000) : 0;
  const to = dateTo ? Math.floor(dateTo.getTime() / 1000) : Infinity;
  return bets.filter((b) => b.createdAt >= from && b.createdAt <= to);
}

// ─── Aggregation Functions ───

/**
 * Compute KPI overview from settled bets.
 */
export function getKPIOverview(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): KPIOverview {
  const filtered = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const won = filtered.filter((b) => b.status === "won");

  const totalWagered = filtered.reduce((s, b) => s + b.amount, 0);
  const totalReturned = filtered.reduce((s, b) => s + betReturn(b), 0);
  const netProfit = totalReturned - totalWagered;

  return {
    totalBets: filtered.length,
    totalWagered,
    totalReturned,
    netProfit,
    winRate: calculateWinRate(won.length, filtered.length),
    avgOdds: calculateAvgOdds(filtered.map((b) => b.totalOdds)),
    avgStake: filtered.length ? Math.round(totalWagered / filtered.length) : 0,
    roi: calculateROI(netProfit, totalWagered),
    yield: calculateYield(netProfit, totalWagered),
  };
}

/**
 * Profit over time with cumulative line and daily deltas.
 */
export function getProfitOverTime(
  bets: BetRecord[],
  dateFrom: Date,
  dateTo: Date,
  granularity: "day" | "week" | "month" = "day",
): ChartDataPoint[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo)
    .filter(isSettled)
    .sort((a, b) => a.createdAt - b.createdAt);

  // Group by key
  const map = new Map<string, { profit: number; label: string; timestamp: number }>();

  for (const bet of settled) {
    const d = new Date(bet.createdAt * 1000);
    let key: string;
    let label: string;

    switch (granularity) {
      case "week": {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        key = weekStart.toISOString().split("T")[0];
        label = weekStart.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        break;
      }
      case "month":
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
        break;
      default: {
        key = d.toISOString().split("T")[0];
        label = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
        break;
      }
    }

    const entry = map.get(key) ?? { profit: 0, label, timestamp: d.getTime() };
    entry.profit += betProfit(bet);
    map.set(key, entry);
  }

  // Fill gaps and build cumulative
  const points: ChartDataPoint[] = [];
  let cumulative = 0;

  const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));

  // For day granularity, fill in missing dates
  if (granularity === "day") {
    const fromTime = dateFrom.getTime();
    const toTime = dateTo.getTime();
    const dayMs = 86400000;
    const profitMap = new Map(entries.map(([k, v]) => [k, v.profit]));
    const labelMap = new Map(entries.map(([k, v]) => [k, v.label]));

    for (let t = fromTime; t <= toTime; t += dayMs) {
      const d = new Date(t);
      const key = d.toISOString().split("T")[0];
      const dailyProfit = profitMap.get(key) ?? 0;
      cumulative += dailyProfit;
      const label =
        labelMap.get(key) ?? d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
      points.push({
        label,
        value: cumulative,
        secondaryValue: dailyProfit,
        date: key,
      });
    }
  } else {
    for (const [key, entry] of entries) {
      cumulative += entry.profit;
      points.push({
        label: entry.label,
        value: cumulative,
        secondaryValue: entry.profit,
        date: key,
      });
    }
  }

  return points;
}

/**
 * Per-sport breakdown. Without sport metadata, all bets are "Football".
 */
export function getSportBreakdown(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): SportBreakdown[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const won = settled.filter((b) => b.status === "won");
  const profit = settled.reduce((s, b) => s + betProfit(b), 0);
  const wagered = settled.reduce((s, b) => s + b.amount, 0);

  return [
    {
      sport: "Football",
      bets: settled.length,
      wins: won.length,
      winRate: calculateWinRate(won.length, settled.length),
      profit,
    },
  ];
}

/**
 * Per-market breakdown derived from outcome metadata.
 */
export function getMarketBreakdown(
  bets: BetRecord[],
  outcomeMap: Map<string, OutcomeInfo[]>,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): MarketBreakdown[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const map = new Map<string, { bets: number; wins: number; profit: number }>();

  for (const bet of settled) {
    const outcomes = outcomeMap.get(bet.id) ?? [];
    const market = outcomes[0]?.marketName ?? "Unknown";
    const entry = map.get(market) ?? { bets: 0, wins: 0, profit: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    map.set(market, entry);
  }

  return Array.from(map.entries())
    .map(([market, v]) => ({
      market,
      bets: v.bets,
      wins: v.wins,
      winRate: calculateWinRate(v.wins, v.bets),
      profit: v.profit,
      roi: calculateROI(v.profit, v.bets * (v.bets ? v.profit / v.bets + 0 : 0)),
    }))
    .map((row) => {
      // Recalculate ROI properly using wagered amount from bets
      const marketBets = settled.filter((b) => {
        const outcomes = outcomeMap.get(b.id) ?? [];
        return (outcomes[0]?.marketName ?? "Unknown") === row.market;
      });
      const wagered = marketBets.reduce((s, b) => s + b.amount, 0);
      return { ...row, roi: calculateROI(row.profit, wagered) };
    })
    .sort((a, b) => b.bets - a.bets);
}

/**
 * Per-month trend.
 */
export function getMonthlyTrend(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): MonthlyTrend[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const map = new Map<string, { bets: number; wins: number; profit: number; totalOdds: number }>();

  for (const bet of settled) {
    const d = new Date(bet.createdAt * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = map.get(key) ?? { bets: 0, wins: 0, profit: 0, totalOdds: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    entry.totalOdds += bet.totalOdds;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      bets: v.bets,
      wins: v.wins,
      profit: v.profit,
      avgOdds: v.bets ? Math.round((v.totalOdds / v.bets) * 100) / 100 : 0,
      winRate: calculateWinRate(v.wins, v.bets),
    }));
}

/**
 * Time-of-day analysis (0-23 hours).
 */
export function getTimeOfDayAnalysis(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): TimeOfDayData[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const map = new Map<number, { bets: number; wins: number; profit: number }>();

  for (const bet of settled) {
    const hour = new Date(bet.createdAt * 1000).getHours();
    const entry = map.get(hour) ?? { bets: 0, wins: 0, profit: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    map.set(hour, entry);
  }

  return Array.from({ length: 24 }, (_, i) => {
    const entry = map.get(i);
    return {
      hour: i,
      bets: entry?.bets ?? 0,
      winRate: entry ? calculateWinRate(entry.wins, entry.bets) : 0,
      profit: entry?.profit ?? 0,
    };
  });
}

/**
 * Per-league performance derived from fixture slugs.
 */
export function getLeaguePerformance(
  bets: BetRecord[],
  outcomeMap: Map<string, OutcomeInfo[]>,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): LeaguePerformance[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const map = new Map<string, { bets: number; wins: number; profit: number; totalOdds: number }>();

  for (const bet of settled) {
    const outcomes = outcomeMap.get(bet.id) ?? [];
    const slug = outcomes[0]?.fixtureSlug ?? "unknown";
    const league = slug.split("-").slice(0, 2).join(" ") || "Unknown";
    const entry = map.get(league) ?? { bets: 0, wins: 0, profit: 0, totalOdds: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    entry.totalOdds += bet.totalOdds;
    map.set(league, entry);
  }

  return Array.from(map.entries())
    .map(([league, v]) => {
      const leagueBets = settled.filter((b) => {
        const outcomes = outcomeMap.get(b.id) ?? [];
        const slug = outcomes[0]?.fixtureSlug ?? "unknown";
        return slug.split("-").slice(0, 2).join(" ") === league;
      });
      const wagered = leagueBets.reduce((s, b) => s + b.amount, 0);
      return {
        league,
        bets: v.bets,
        wins: v.wins,
        winRate: calculateWinRate(v.wins, v.bets),
        profit: v.profit,
        roi: calculateROI(v.profit, wagered),
        avgOdds: v.bets ? Math.round((v.totalOdds / v.bets) * 100) / 100 : 0,
      };
    })
    .sort((a, b) => b.bets - a.bets);
}

/**
 * Staking performance per preset.
 */
export function getStakingPerformance(
  bets: BetRecord[],
  presetNames: Map<string, string>,
  dateFrom?: Date | null,
  dateTo?: Date | null,
): StakingPerformance[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);

  // Group by betType as a proxy for staking mode
  const map = new Map<string, { bets: number; wins: number; profit: number }>();

  for (const bet of settled) {
    const preset = presetNames.get(bet.betType) ?? bet.betType;
    const entry = map.get(preset) ?? { bets: 0, wins: 0, profit: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    map.set(preset, entry);
  }

  return Array.from(map.entries())
    .map(([preset, v]) => {
      const modeBets = settled.filter((b) => {
        const p = presetNames.get(b.betType) ?? b.betType;
        return p === preset;
      });
      const wagered = modeBets.reduce((s, b) => s + b.amount, 0);
      return {
        preset,
        bets: v.bets,
        wins: v.wins,
        profit: v.profit,
        roi: calculateROI(v.profit, wagered),
      };
    })
    .sort((a, b) => b.bets - a.bets);
}

const ODDS_RANGES: [number, number, string][] = [
  [0, 1.5, "< 1.50"],
  [1.5, 2.0, "1.50 – 2.00"],
  [2.0, 3.0, "2.00 – 3.00"],
  [3.0, 5.0, "3.00 – 5.00"],
  [5.0, 10.0, "5.00 – 10.00"],
  [10.0, Infinity, "10.00+"],
];

/**
 * Performance by odds range with expected value.
 */
export function getOddsPerformance(
  bets: BetRecord[],
  dateFrom?: Date | null,
  dateTo?: Date | null,
): OddsPerformance[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo).filter(isSettled);
  const map = new Map<string, { bets: number; wins: number; profit: number }>();

  for (const bet of settled) {
    const range = ODDS_RANGES.find(([lo, hi]) => bet.totalOdds >= lo && bet.totalOdds < hi);
    const label = range?.[2] ?? "Unknown";
    const entry = map.get(label) ?? { bets: 0, wins: 0, profit: 0 };
    entry.bets++;
    if (bet.status === "won") entry.wins++;
    entry.profit += betProfit(bet);
    map.set(label, entry);
  }

  return ODDS_RANGES.map(([, , label]) => {
    const entry = map.get(label);
    if (!entry) return { range: label, bets: 0, wins: 0, winRate: 0, profit: 0, expectedValue: 0 };
    const winRate = calculateWinRate(entry.wins, entry.bets);
    // Approximate mid-point odds for EV
    const rangeDef = ODDS_RANGES.find(([, , l]) => l === label)!;
    const midOdds = rangeDef[1] === Infinity ? rangeDef[0] + 1 : (rangeDef[0] + rangeDef[1]) / 2;
    const ev = (winRate / 100) * (midOdds - 1) - (1 - winRate / 100);
    return {
      range: label,
      bets: entry.bets,
      wins: entry.wins,
      winRate,
      profit: entry.profit,
      expectedValue: Math.round(ev * 100) / 100,
    };
  });
}

/**
 * Compute daily profit deltas (non-cumulative daily changes).
 */
export function getDailyDeltas(bets: BetRecord[], dateFrom: Date, dateTo: Date): ChartDataPoint[] {
  const settled = filterByDateRange(bets, dateFrom, dateTo)
    .filter(isSettled)
    .sort((a, b) => a.createdAt - b.createdAt);

  const dailyMap = new Map<string, number>();
  for (const bet of settled) {
    const key = new Date(bet.createdAt * 1000).toISOString().split("T")[0];
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + betProfit(bet));
  }

  const points: ChartDataPoint[] = [];
  const fromTime = dateFrom.getTime();
  const toTime = dateTo.getTime();
  const dayMs = 86400000;

  for (let t = fromTime; t <= toTime; t += dayMs) {
    const d = new Date(t);
    const key = d.toISOString().split("T")[0];
    points.push({
      label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      value: dailyMap.get(key) ?? 0,
      date: key,
    });
  }

  return points;
}

/**
 * Compute Sharpe ratio from daily returns.
 */
export function getSharpeRatio(bets: BetRecord[], dateFrom: Date, dateTo: Date): number {
  const dailyDeltas = getDailyDeltas(bets, dateFrom, dateTo);
  const dailyReturns = dailyDeltas.map((d) => d.value).filter((v) => v !== 0);

  if (dailyReturns.length < 2) return 0;

  // Normalize to % of bankroll approximation
  const avgStake = dailyReturns.length
    ? Math.abs(dailyReturns.reduce((s, r) => s + r, 0)) / dailyReturns.length
    : 1;

  const returns = dailyReturns.map((r) => r / Math.max(avgStake, 1));
  return Math.round(calculateSharpeRatio(returns) * 100) / 100;
}
