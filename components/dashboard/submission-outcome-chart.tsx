"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type SubmissionOutcomeDatum = {
  dateLabel: string;
  accepted: number;
  failed: number;
};

type SubmissionOutcomeChartProps = {
  data: SubmissionOutcomeDatum[];
  acceptedLabel?: string;
  failedLabel?: string;
};

export function SubmissionOutcomeChart({
  data,
  acceptedLabel = "Accepted",
  failedLabel = "Failed",
}: SubmissionOutcomeChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
          <XAxis
            dataKey="dateLabel"
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{
              fill: "hsl(var(--muted-foreground))",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            labelStyle={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
          />
          <Legend
            wrapperStyle={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "hsl(var(--muted-foreground))",
            }}
          />
          <Area
            type="monotone"
            dataKey="accepted"
            name={acceptedLabel}
            stroke="hsl(var(--success))"
            fill="hsl(var(--success))"
            fillOpacity={0.15}
            strokeWidth={2}
            dot={{ strokeWidth: 2, r: 2 }}
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="failed"
            name={failedLabel}
            stroke="hsl(var(--destructive))"
            fill="hsl(var(--destructive))"
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ strokeWidth: 2, r: 2 }}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
