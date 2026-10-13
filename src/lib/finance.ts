import type { CostSlice, MonthlyFinancials } from "@/types";

// ---------------------------------------------------------------------------
// Agregados del dashboard a partir de los resultados mensuales.
// ---------------------------------------------------------------------------

export function getFinancialSummary(data: MonthlyFinancials[]) {
  const sum = (pick: (m: MonthlyFinancials) => number) => data.reduce((acc, m) => acc + pick(m), 0);
  const revenue = sum((m) => m.revenue);
  const dieselPartsCost = sum((m) => m.dieselPartsCost);
  const thirdPartyCost = sum((m) => m.thirdPartyCost);
  const laborCost = sum((m) => m.laborCost);
  const overheadCost = sum((m) => m.overheadCost);
  const grossMargin = revenue - dieselPartsCost - thirdPartyCost;

  return {
    revenue,
    dieselPartsCost,
    thirdPartyCost,
    laborCost,
    overheadCost,
    grossMargin,
    grossMarginPct: revenue ? (grossMargin / revenue) * 100 : 0,
  };
}

export function getCostDistribution(data: MonthlyFinancials[]): CostSlice[] {
  const s = getFinancialSummary(data);
  return [
    { key: "diesel", name: "Repuestos diésel", kind: "directo", value: s.dieselPartsCost },
    { key: "terceros", name: "Servicios de terceros", kind: "directo", value: s.thirdPartyCost },
    { key: "mano_obra", name: "Mano de obra", kind: "operativo", value: s.laborCost },
    { key: "gastos", name: "Gastos generales", kind: "operativo", value: s.overheadCost },
  ];
}

/** Variación porcentual entre el último mes y el anterior. */
export function monthOverMonth(pick: (m: MonthlyFinancials) => number, data: MonthlyFinancials[]) {
  const last = data.at(-1);
  const prev = data.at(-2);
  if (!last || !prev || pick(prev) === 0) return 0;
  return ((pick(last) - pick(prev)) / pick(prev)) * 100;
}
