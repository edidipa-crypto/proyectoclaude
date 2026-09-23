"use client";

import { useMemo, useState } from "react";
import { DollarSign, Fuel, Percent, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCostDistribution, getFinancialSummary, monthOverMonth } from "@/lib/mock-data";
import { cn, formatCOP, formatPercent } from "@/lib/utils";
import type { MonthlyFinancials } from "@/types";
import { CostDistributionChart } from "./cost-distribution-chart";
import { KpiCard } from "./kpi-card";
import { RevenueExpenseChart } from "./revenue-expense-chart";

const PERIODS = [
  { months: 3, label: "3 meses" },
  { months: 6, label: "6 meses" },
  { months: 12, label: "12 meses" },
] as const;

export function FinancialDashboard({ data }: { data: MonthlyFinancials[] }) {
  const [months, setMonths] = useState<number>(12);

  const filtered = useMemo(() => data.slice(-months), [data, months]);
  const summary = useMemo(() => getFinancialSummary(filtered), [filtered]);
  const costs = useMemo(() => getCostDistribution(filtered), [filtered]);

  const last = data.at(-1);
  const prev = data.at(-2);
  const momHint = last && prev ? `${last.label} vs ${prev.label}` : undefined;

  const operatingIncome = summary.grossMargin - summary.laborCost - summary.overheadCost;

  const pnl = [
    { label: "Ingresos operacionales", value: summary.revenue, strong: true },
    { label: "(−) Repuestos diésel", value: -summary.dieselPartsCost },
    { label: "(−) Servicios de terceros", value: -summary.thirdPartyCost },
    { label: "Margen bruto", value: summary.grossMargin, strong: true, pct: summary.grossMarginPct },
    { label: "(−) Mano de obra", value: -summary.laborCost },
    { label: "(−) Gastos generales", value: -summary.overheadCost },
    {
      label: "Utilidad operativa",
      value: operatingIncome,
      strong: true,
      pct: summary.revenue ? (operatingIncome / summary.revenue) * 100 : 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de periodo: una sola fila sobre los gráficos */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Periodo">
        <span className="mr-1 text-sm text-muted-foreground">Periodo:</span>
        {PERIODS.map((p) => (
          <Button
            key={p.months}
            size="sm"
            variant={months === p.months ? "default" : "outline"}
            aria-pressed={months === p.months}
            onClick={() => setMonths(p.months)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores clave">
        <KpiCard
          title="Ingresos totales"
          value={formatCOP(summary.revenue)}
          icon={DollarSign}
          delta={monthOverMonth((m) => m.revenue, data)}
          hint={momHint}
        />
        <KpiCard
          title="Costos diésel"
          value={formatCOP(summary.dieselPartsCost)}
          icon={Fuel}
          delta={monthOverMonth((m) => m.dieselPartsCost, data)}
          hint={momHint}
        />
        <KpiCard
          title="Costos terceros"
          value={formatCOP(summary.thirdPartyCost)}
          icon={Truck}
          delta={monthOverMonth((m) => m.thirdPartyCost, data)}
          hint={momHint}
        />
        <KpiCard
          title="Margen bruto"
          value={formatCOP(summary.grossMargin)}
          icon={Percent}
          hint={`${formatPercent(summary.grossMarginPct)} sobre ingresos`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <RevenueExpenseChart data={filtered} />
        <CostDistributionChart data={costs} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Estado de resultados (P&amp;L)</CardTitle>
          <CardDescription>
            {filtered[0]?.label} – {filtered.at(-1)?.label} · {filtered.length} meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {pnl.map((row) => (
              <div key={row.label} className={cn("flex items-center justify-between gap-4 py-2.5", row.strong && "font-semibold")}>
                <dt className={cn(!row.strong && "pl-4 text-muted-foreground")}>{row.label}</dt>
                <dd className="flex items-baseline gap-3 tabular-nums">
                  {row.pct !== undefined && (
                    <span className="text-xs font-normal text-muted-foreground">{formatPercent(row.pct)}</span>
                  )}
                  {formatCOP(row.value)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
