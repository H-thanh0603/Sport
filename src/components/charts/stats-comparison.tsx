"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MatchStatistic } from "@/server/services/types";

/** Home/away comparison bar chart for match statistics (Recharts). */
export function StatsComparisonChart({ statistics }: { statistics: MatchStatistic[] }) {
  const rows = statistics.map((s) => ({
    name: s.label ?? s.key,
    home: parseFloat(s.home) || 0,
    away: parseFloat(s.away) || 0,
    homeLabel: s.home,
    awayLabel: s.away,
  }));
  if (rows.length === 0) return null;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }} barGap={2}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            stroke="hsl(var(--border))"
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "calc(var(--radius) - 4px)",
              fontSize: 12,
            }}
            formatter={(_value, _name, item) => {
              const p = item.payload as (typeof rows)[number];
              return [`${p.homeLabel} — ${p.awayLabel}`, p.name];
            }}
          />
          <Bar dataKey="home" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
          <Bar dataKey="away" radius={[0, 3, 3, 0]}>
            {rows.map((r) => (
              <Cell key={r.name} fill="hsl(var(--muted-foreground) / 0.55)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-primary" /> Đội chủ nhà
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-muted-foreground/55" /> Đội khách
        </span>
      </p>
    </div>
  );
}
