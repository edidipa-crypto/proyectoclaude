"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCOP, formatCOPCompact } from "@/lib/utils";
import type { MonthlyFinancials } from "@/types";
import { ChartTooltip } from "./chart-tooltip";

const SERIES = [
  { key: "revenue", name: "Ingresos", color: "var(--chart-1)" },
  { key: "expenses", name: "Egresos", color: "var(--chart-2)" },
] as const;

export function RevenueExpenseChart({ data }: { data: MonthlyFinancials[] }) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const rows = data.map((m) => ({
    label: m.label,
    revenue: m.revenue,
    expenses: m.dieselPartsCost + m.thirdPartyCost + m.laborCost + m.overheadCost,
  }));

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Ingresos vs Egresos</CardTitle>
          <CardDescription>Comparativo mensual (COP). Egresos = repuestos + terceros + nómina + gastos.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          aria-pressed={view === "table"}
        >
          {view === "chart" ? "Ver tabla" : "Ver gráfico"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground" aria-hidden={view === "table"}>
          {SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>

        {view === "chart" ? (
          <div className="h-[360px] w-full" role="img" aria-label="Gráfico de barras de ingresos y egresos mensuales">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} barGap={2} barCategoryGap="24%" margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={formatCOPCompact}
                  tick={{ fill: "var(--chart-axis)", fontSize: 12 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.6 }} />
                {SERIES.map((s) => (
                  <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Egresos</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell className="py-2">{r.label}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{formatCOP(r.revenue)}</TableCell>
                  <TableCell className="py-2 text-right tabular-nums">{formatCOP(r.expenses)}</TableCell>
                  <TableCell className="py-2 text-right font-medium tabular-nums">{formatCOP(r.revenue - r.expenses)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
