// ---------------------------------------------------------------------------
// Cálculos de dinero del taller. Todos los valores son pesos colombianos enteros.
// Cubiertos por pruebas en money.test.ts.
// ---------------------------------------------------------------------------

import { daysBetween } from "./dates";
import type { LineKind, WithholdingConfig } from "@/types";

export const VAT_RATE = 19;

export function roundCOP(value: number): number {
  return Math.round(value) + 0; // "+ 0" evita -0
}

export function marginPct(profit: number, sales: number): number {
  if (sales === 0) return 0;
  return Math.round((profit / sales) * 1000) / 10;
}

// --- Líneas y totales ------------------------------------------------------

export interface LineInput {
  kind: LineKind;
  quantity: number;
  /** Precio de venta unitario antes de IVA */
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  discountPct: number;
}

export interface LineAmounts {
  gross: number;
  discount: number;
  subtotal: number;
  tax: number;
  total: number;
  cost: number;
  profit: number;
}

export function lineAmounts(line: Omit<LineInput, "kind">): LineAmounts {
  const gross = roundCOP(line.quantity * line.unitPrice);
  const discount = roundCOP((gross * line.discountPct) / 100);
  const subtotal = gross - discount;
  const tax = roundCOP((subtotal * line.taxRate) / 100);
  const cost = roundCOP(line.quantity * line.unitCost);
  return { gross, discount, subtotal, tax, total: subtotal + tax, cost, profit: subtotal - cost };
}

export interface Totals {
  gross: number;
  discount: number;
  subtotal: number;
  taxableBase: number;
  exemptBase: number;
  tax: number;
  total: number;
  cost: number;
  profit: number;
  marginPct: number;
  /** Subtotal antes de IVA por tipo de línea */
  byKind: Record<LineKind, number>;
  /** Costo por tipo de línea */
  costByKind: Record<LineKind, number>;
}

export function computeTotals(lines: LineInput[]): Totals {
  const t: Totals = {
    gross: 0,
    discount: 0,
    subtotal: 0,
    taxableBase: 0,
    exemptBase: 0,
    tax: 0,
    total: 0,
    cost: 0,
    profit: 0,
    marginPct: 0,
    byKind: { labor: 0, part: 0, third_party: 0 },
    costByKind: { labor: 0, part: 0, third_party: 0 },
  };
  for (const line of lines) {
    const a = lineAmounts(line);
    t.gross += a.gross;
    t.discount += a.discount;
    t.subtotal += a.subtotal;
    if (line.taxRate > 0) t.taxableBase += a.subtotal;
    else t.exemptBase += a.subtotal;
    t.tax += a.tax;
    t.total += a.total;
    t.cost += a.cost;
    t.profit += a.profit;
    t.byKind[line.kind] += a.subtotal;
    t.costByKind[line.kind] += a.cost;
  }
  t.marginPct = marginPct(t.profit, t.subtotal);
  return t;
}

/** Precio al cliente de un trabajo de tercero: costo + margen, redondeado a miles. */
export function thirdPartyPrice(cost: number, markupPct: number): number {
  return Math.round((cost * (1 + markupPct / 100)) / 1000) * 1000;
}

// --- Retenciones que nos practican los clientes ---------------------------

export interface WithholdingRates {
  /** % sobre servicios (mano de obra y terceros) */
  incomeServices: number;
  /** % sobre venta de repuestos */
  incomeGoods: number;
  /** % sobre el IVA */
  vat: number;
  /** Por mil sobre el subtotal */
  icaPerThousand: number;
}

// Tarifas generales por defecto; se confirman con el contador según ciudad y actividad.
export const DEFAULT_WITHHOLDING_RATES: WithholdingRates = {
  incomeServices: 4,
  incomeGoods: 2.5,
  vat: 15,
  icaPerThousand: 9.66,
};

export interface Withholdings {
  income: number;
  vat: number;
  ica: number;
  total: number;
  /** Lo que realmente consigna el cliente */
  netPayable: number;
}

export function computeWithholdings(
  totals: Totals,
  config: WithholdingConfig,
  rates: WithholdingRates = DEFAULT_WITHHOLDING_RATES,
): Withholdings {
  const services = totals.byKind.labor + totals.byKind.third_party;
  const goods = totals.byKind.part;
  const income = config.income
    ? roundCOP((services * rates.incomeServices) / 100) + roundCOP((goods * rates.incomeGoods) / 100)
    : 0;
  const vat = config.vat ? roundCOP((totals.tax * rates.vat) / 100) : 0;
  const ica = config.ica ? roundCOP((totals.subtotal * rates.icaPerThousand) / 1000) : 0;
  const total = income + vat + ica;
  return { income, vat, ica, total, netPayable: totals.total - total };
}

// --- Inventario: costo promedio ponderado y kárdex -------------------------

export function weightedAverageCost(stock: number, currentCost: number, qtyIn: number, costIn: number): number {
  if (stock <= 0) return roundCOP(costIn);
  return roundCOP((stock * currentCost + qtyIn * costIn) / (stock + qtyIn));
}

export interface StockMovement {
  id: string;
  itemId: string;
  date: string;
  type: "entrada" | "salida" | "ajuste";
  /** En ajustes puede ser negativa */
  quantity: number;
  unitCost: number;
  reference: string;
}

export interface KardexLine extends StockMovement {
  balance: number;
  averageCost: number;
  balanceValue: number;
}

/**
 * Recorre los movimientos en orden y calcula saldo y costo promedio.
 * Salidas y ajustes se valoran al costo promedio vigente.
 * Lanza un error si una salida deja el saldo en negativo.
 */
export function computeKardex(movements: StockMovement[]): KardexLine[] {
  let balance = 0;
  let average = 0;
  return movements.map((m) => {
    let unitCost = m.unitCost;
    if (m.type === "entrada") {
      average = weightedAverageCost(balance, average, m.quantity, m.unitCost);
      balance += m.quantity;
    } else {
      const delta = m.type === "salida" ? -m.quantity : m.quantity;
      if (balance + delta < 0) {
        throw new Error(`Existencia insuficiente en ${m.reference}: hay ${balance}, se piden ${-delta}`);
      }
      balance += delta;
      unitCost = average;
    }
    return { ...m, unitCost, balance, averageCost: average, balanceValue: roundCOP(balance * average) };
  });
}

// --- Estado de resultados ---------------------------------------------------

export interface ProfitAndLoss {
  revenue: number;
  partsCost: number;
  thirdPartyCost: number;
  grossMargin: number;
  grossMarginPct: number;
  laborCost: number;
  overheadCost: number;
  operatingIncome: number;
  operatingMarginPct: number;
}

export function computePnL(input: {
  revenue: number;
  partsCost: number;
  thirdPartyCost: number;
  laborCost: number;
  overheadCost: number;
}): ProfitAndLoss {
  const grossMargin = input.revenue - input.partsCost - input.thirdPartyCost;
  const operatingIncome = grossMargin - input.laborCost - input.overheadCost;
  return {
    ...input,
    grossMargin,
    grossMarginPct: marginPct(grossMargin, input.revenue),
    operatingIncome,
    operatingMarginPct: marginPct(operatingIncome, input.revenue),
  };
}

// --- Cartera ------------------------------------------------------------------

export type AgingBucket = "al_dia" | "1_30" | "31_60" | "61_90" | "mas_90";

export const AGING_LABEL: Record<AgingBucket, string> = {
  al_dia: "Al día",
  "1_30": "1–30 días",
  "31_60": "31–60 días",
  "61_90": "61–90 días",
  mas_90: "Más de 90",
};

export function daysOverdue(dueDate: string, today: string): number {
  return Math.max(0, daysBetween(dueDate, today));
}

export function agingBucket(days: number): AgingBucket {
  if (days <= 0) return "al_dia";
  if (days <= 30) return "1_30";
  if (days <= 60) return "31_60";
  if (days <= 90) return "61_90";
  return "mas_90";
}

export function outstanding(total: number, payments: { amount: number }[]): number {
  return Math.max(0, total - payments.reduce((s, p) => s + p.amount, 0));
}
