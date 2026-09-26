"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutDatum = { name: string; value: number; color: string };

export function StockDonutChart({ data }: { data: DonutDatum[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">No product data yet.</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={224}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} strokeWidth={0}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}
