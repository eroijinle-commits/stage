import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";
import { ChartDataPoint } from "@/lib/contracts/ui.contract";

interface SparklineProps { data: ChartDataPoint[]; color?: string; height?: number; }

export default function Sparkline({ data, color = "#10b981", height = 40 }: SparklineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} />
        <Tooltip
          contentStyle={{ background: "#111418", border: "1px solid #1e2530", borderRadius: 4, fontSize: 11, fontFamily: "JetBrains Mono, monospace" }}
          labelStyle={{ color: "#6b7280" }}
          itemStyle={{ color: "#e8eaed" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
