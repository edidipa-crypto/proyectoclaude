"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCOP, formatCOPCompact, formatPercent } from "@/lib/utils";
import type { CostSlice } from "@/types";
import { ChartTooltip } from "./chart-tooltip";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function CostDistributionChart({ data }: { data: CostSlice[] }) {
  const total = data.reduce((acc, s) => acc + s.value, 0);
  const slices = data.map((s, i) => ({ ...s, fill: COLORS[i % COLORS.length] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución de costos</CardTitle>
        <CardDescription>Costos directos vs operativos del periodo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto h-[200px] w-full max-w-[240px]" role="img" aria-label="Gráfico de dona de distribución de costos">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius="64%"
                outerRadius="100%"
                paddingAngle={1}
                stroke="hsl(var(--card))"
                strokeWidth={2}
                startAngle={90}
                endAngle={-270}
              >
                {slices.map((s) => (
                  <Cell key={s.key} fill={s.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-lg font-bold tabular-nums">{formatCOPCompact(total)}</span>
          </div>
        </div>

        {/* Leyenda + vista tabular (identidad nunca solo por color) */}
        <ul className="mt-5 divide-y text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-start gap-2">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.fill }} aria-hidden />
                <span className="min-w-0">
                  <span className="block">{s.name}</span>
                  <span className="text-xs capitalize text-muted-foreground">{s.kind}</span>
                </span>
              </span>
              <span className="shrink-0 text-right tabular-nums">
                <span className="block font-medium">{formatPercent((s.value / total) * 100)}</span>
                <span className="text-xs text-muted-foreground">{formatCOP(s.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
