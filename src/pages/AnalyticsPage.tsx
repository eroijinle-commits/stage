import { useAnalytics } from "@/hooks/useAnalytics";
import { StatCard } from "@/components/ui";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Target,
  DollarSign,
  Activity,
  Download,
  BarChart3,
  Clock,
  Trophy,
  Layers,
  Zap,
} from "lucide-react";

const CHART_STYLE = {
  contentStyle: {
    background: "#111418",
    border: "1px solid #1e2530",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: "JetBrains Mono, monospace",
  },
  labelStyle: { color: "#6b7280" },
  itemStyle: { color: "#e8eaed" },
};

function ProfitBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: { value: number };
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  const isPositive = (payload?.value ?? 0) >= 0;
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={isPositive ? "#10b981" : "#ef4444"}
      rx={2}
    />
  );
}

export default function AnalyticsPage() {
  const {
    kpi,
    profitData,
    dailyDeltas,
    marketBreakdown,
    monthlyTrend,
    timeOfDay,
    leaguePerformance,
    stakingPerformance,
    oddsPerformance,
    sharpeRatio,
    isLoading,
    exportData,
  } = useAnalytics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* ─── KPI Row ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="Total Bets" value={kpi.totalBets} icon={<Activity size={14} />} />
        <StatCard
          title="Win Rate"
          value={kpi.winRate}
          format="percentage"
          trend={kpi.winRate > 50 ? "up" : "down"}
          change={kpi.winRate - 50}
          changeLabel="vs 50%"
          icon={<Target size={14} />}
        />
        <StatCard
          title="Net P/L"
          value={Math.abs(kpi.netProfit)}
          format="currency"
          currency="NGN"
          trend={kpi.netProfit >= 0 ? "up" : "down"}
          icon={<DollarSign size={14} />}
        />
        <StatCard
          title="ROI"
          value={kpi.roi}
          format="percentage"
          trend={kpi.roi >= 0 ? "up" : "down"}
          change={kpi.roi}
          changeLabel="overall"
          icon={<TrendingUp size={14} />}
        />
      </div>

      {/* ─── Secondary KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Avg Stake"
          value={kpi.avgStake}
          format="currency"
          currency="NGN"
          icon={<DollarSign size={14} />}
        />
        <StatCard
          title="Yield"
          value={kpi.yield}
          format="percentage"
          trend={kpi.yield >= 0 ? "up" : "down"}
          icon={<BarChart3 size={14} />}
        />
        <StatCard
          title="Sharpe"
          value={sharpeRatio}
          format="number"
          trend={sharpeRatio > 1 ? "up" : sharpeRatio > 0 ? "neutral" : "down"}
          icon={<Zap size={14} />}
        />
        <StatCard
          title="Avg Odds"
          value={kpi.avgOdds}
          format="number"
          icon={<Layers size={14} />}
        />
      </div>

      {/* ─── Cumulative P/L + Market Breakdown ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-card border border-border rounded p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
                Cumulative P/L
              </h3>
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                NGN · daily movement
              </p>
            </div>
            <span
              className={`text-sm font-mono font-bold tabular-nums ${
                kpi.netProfit >= 0 ? "text-bet-won" : "text-bet-lost"
              }`}
            >
              {kpi.netProfit >= 0 ? "+" : ""}₦{kpi.netProfit.toLocaleString("en-NG")}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={profitData}>
              <defs>
                <linearGradient id="plGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v) => [`₦${Number(v ?? 0).toLocaleString("en-NG")}`, "Cumulative P/L"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#plGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
            By Market
          </h3>
          <div className="space-y-2">
            {marketBreakdown.slice(0, 8).map((m) => (
              <div key={m.market} className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="truncate">{m.market}</span>
                  <span>
                    {m.winRate.toFixed(1)}% ({m.bets})
                  </span>
                </div>
                <div className="h-1 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary rounded"
                    style={{ width: `${Math.min(m.winRate, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Daily P/L Bar Chart ─── */}
      <div className="bg-card border border-border rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider">
            Daily P/L
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            green = profit · red = loss
          </span>
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={dailyDeltas}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              {...CHART_STYLE}
              formatter={(v) => [`₦${Number(v ?? 0).toLocaleString("en-NG")}`, "Daily P/L"]}
            />
            <Bar dataKey="value" shape={<ProfitBar />} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── Monthly Trend + Time of Day ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
            Monthly Trend
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v, name) => [
                  name === "profit" ? `₦${Number(v ?? 0).toLocaleString("en-NG")}` : v,
                  name,
                ]}
              />
              <Bar dataKey="bets" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Bets" />
              <Bar dataKey="profit" fill="#10b981" radius={[2, 2, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
          {monthlyTrend.length > 0 && (
            <div className="mt-2 flex gap-4 text-[10px] font-mono text-muted-foreground">
              {monthlyTrend.map((m) => (
                <span key={m.month}>
                  {m.month}: {m.winRate.toFixed(1)}% WR · avg {m.avgOdds.toFixed(2)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
            <Clock size={12} className="inline mr-1.5" />
            Time of Day
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeOfDay.filter((t) => t.bets > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2530" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: "JetBrains Mono", fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                {...CHART_STYLE}
                formatter={(v, name) => [
                  name === "profit" ? `₦${Number(v ?? 0).toLocaleString("en-NG")}` : v,
                  name,
                ]}
              />
              <Bar dataKey="bets" fill="#6366f1" radius={[2, 2, 0, 0]} name="Bets" />
              <Bar dataKey="profit" fill="#10b981" radius={[2, 2, 0, 0]} name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── League Performance ─── */}
      {leaguePerformance.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
            <Trophy size={12} className="inline mr-1.5" />
            League Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-4">League</th>
                  <th className="text-right py-2 px-2">Bets</th>
                  <th className="text-right py-2 px-2">Win Rate</th>
                  <th className="text-right py-2 px-2">Profit</th>
                  <th className="text-right py-2 px-2">ROI</th>
                  <th className="text-right py-2 pl-2">Avg Odds</th>
                </tr>
              </thead>
              <tbody>
                {leaguePerformance.slice(0, 10).map((l) => (
                  <tr key={l.league} className="border-b border-border/50">
                    <td className="py-2 pr-4 text-foreground truncate max-w-[160px]">{l.league}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{l.bets}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">
                      {l.winRate.toFixed(1)}%
                    </td>
                    <td
                      className={`py-2 px-2 text-right ${l.profit >= 0 ? "text-bet-won" : "text-bet-lost"}`}
                    >
                      {l.profit >= 0 ? "+" : ""}₦{l.profit.toLocaleString("en-NG")}
                    </td>
                    <td
                      className={`py-2 px-2 text-right ${l.roi >= 0 ? "text-bet-won" : "text-bet-lost"}`}
                    >
                      {l.roi.toFixed(1)}%
                    </td>
                    <td className="py-2 pl-2 text-right text-muted-foreground">
                      {l.avgOdds.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Odds Performance ─── */}
      {oddsPerformance.length > 0 && (
        <div className="bg-card border border-border rounded p-4">
          <h3 className="text-xs font-mono font-semibold text-foreground uppercase tracking-wider mb-4">
            <Layers size={12} className="inline mr-1.5" />
            Odds Range Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-4">Range</th>
                  <th className="text-right py-2 px-2">Bets</th>
                  <th className="text-right py-2 px-2">Win Rate</th>
                  <th className="text-right py-2 px-2">Profit</th>
                  <th className="text-right py-2 pl-2">Exp. Value</th>
                </tr>
              </thead>
              <tbody>
                {oddsPerformance
                  .filter((o) => o.bets > 0)
                  .map((o) => (
                    <tr key={o.range} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-foreground">{o.range}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">{o.bets}</td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {o.winRate.toFixed(1)}%
                      </td>
                      <td
                        className={`py-2 px-2 text-right ${o.profit >= 0 ? "text-bet-won" : "text-bet-lost"}`}
                      >
                        {o.profit >= 0 ? "+" : ""}₦{o.profit.toLocaleString("en-NG")}
                      </td>
                      <td
                        className={`py-2 pl-2 text-right ${o.expectedValue >= 0 ? "text-bet-won" : "text-bet-lost"}`}
                      >
                        {o.expectedValue >= 0 ? "+" : ""}
                        {(o.expectedValue * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Export ─── */}
      <div className="flex items-center gap-3 pt-2 pb-4">
        <button
          onClick={() => exportData("csv")}
          className="flex items-center gap-2 px-3 py-2 text-xs font-mono bg-card border border-border rounded hover:bg-muted transition-colors"
        >
          <Download size={12} />
          Export CSV
        </button>
        <button
          onClick={() => exportData("json")}
          className="flex items-center gap-2 px-3 py-2 text-xs font-mono bg-card border border-border rounded hover:bg-muted transition-colors"
        >
          <Download size={12} />
          Export JSON
        </button>
      </div>
    </div>
  );
}
