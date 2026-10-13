import { describe, expect, it } from "vitest";

import {
  agingBucket,
  computeKardex,
  computePnL,
  computeTotals,
  computeWithholdings,
  daysOverdue,
  lineAmounts,
  marginPct,
  outstanding,
  thirdPartyPrice,
  weightedAverageCost,
  type LineInput,
  type StockMovement,
} from "./money";

const line = (p: Partial<LineInput>): LineInput => ({
  kind: "part",
  quantity: 1,
  unitPrice: 0,
  unitCost: 0,
  taxRate: 19,
  discountPct: 0,
  ...p,
});

describe("lineAmounts", () => {
  it("calcula IVA del 19 % sobre el subtotal", () => {
    const l = lineAmounts(line({ quantity: 2, unitPrice: 100_000, unitCost: 60_000 }));
    expect(l.subtotal).toBe(200_000);
    expect(l.tax).toBe(38_000);
    expect(l.total).toBe(238_000);
    expect(l.cost).toBe(120_000);
    expect(l.profit).toBe(80_000);
  });

  it("aplica el descuento antes del IVA", () => {
    const l = lineAmounts(line({ unitPrice: 1_000_000, discountPct: 10 }));
    expect(l.discount).toBe(100_000);
    expect(l.subtotal).toBe(900_000);
    expect(l.tax).toBe(171_000);
  });

  it("redondea a pesos enteros", () => {
    const l = lineAmounts(line({ quantity: 1.5, unitPrice: 95_333 }));
    expect(l.subtotal).toBe(143_000); // 142.999,5 → 143.000
    expect(l.tax).toBe(27_170);
    expect(Number.isInteger(l.total)).toBe(true);
  });

  it("no cobra IVA en líneas excluidas", () => {
    const l = lineAmounts(line({ unitPrice: 50_000, taxRate: 0 }));
    expect(l.tax).toBe(0);
    expect(l.total).toBe(50_000);
  });
});

describe("computeTotals", () => {
  const t = computeTotals([
    line({ kind: "labor", quantity: 4, unitPrice: 95_000, unitCost: 32_000 }),
    line({ kind: "part", quantity: 6, unitPrice: 11_000, unitCost: 6_500 }),
    line({ kind: "third_party", quantity: 1, unitPrice: 900_000, unitCost: 720_000 }),
    line({ kind: "part", quantity: 1, unitPrice: 40_000, unitCost: 30_000, taxRate: 0 }),
  ]);

  it("suma subtotales, IVA y total", () => {
    expect(t.subtotal).toBe(380_000 + 66_000 + 900_000 + 40_000);
    expect(t.tax).toBe(72_200 + 12_540 + 171_000);
    expect(t.total).toBe(t.subtotal + t.tax);
  });

  it("separa base gravada y excluida", () => {
    expect(t.taxableBase).toBe(1_346_000);
    expect(t.exemptBase).toBe(40_000);
  });

  it("calcula costo, utilidad y margen", () => {
    expect(t.cost).toBe(128_000 + 39_000 + 720_000 + 30_000);
    expect(t.profit).toBe(t.subtotal - t.cost);
    expect(t.marginPct).toBe(marginPct(t.profit, t.subtotal));
  });

  it("agrupa ventas y costos por tipo de línea", () => {
    expect(t.byKind).toEqual({ labor: 380_000, part: 106_000, third_party: 900_000 });
    expect(t.costByKind).toEqual({ labor: 128_000, part: 69_000, third_party: 720_000 });
  });

  it("devuelve ceros sin líneas", () => {
    const empty = computeTotals([]);
    expect(empty.total).toBe(0);
    expect(empty.marginPct).toBe(0);
  });
});

describe("marginPct", () => {
  it("redondea a un decimal", () => {
    expect(marginPct(1, 3)).toBe(33.3);
    expect(marginPct(0, 0)).toBe(0);
    expect(marginPct(-50, 200)).toBe(-25);
  });
});

describe("thirdPartyPrice", () => {
  it("suma el margen y redondea a miles", () => {
    expect(thirdPartyPrice(6_200_000, 20)).toBe(7_440_000);
    expect(thirdPartyPrice(1_333_333, 20)).toBe(1_600_000);
    expect(thirdPartyPrice(2_900_000, 0)).toBe(2_900_000);
  });
});

describe("computeWithholdings", () => {
  const t = computeTotals([
    line({ kind: "labor", quantity: 10, unitPrice: 100_000 }),
    line({ kind: "part", quantity: 1, unitPrice: 2_000_000 }),
  ]);

  it("aplica retefuente distinta a servicios y repuestos, reteIVA y reteICA", () => {
    const r = computeWithholdings(t, { income: true, vat: true, ica: true });
    expect(r.income).toBe(40_000 + 50_000);
    expect(r.vat).toBe(85_500); // 15 % de 570.000
    expect(r.ica).toBe(28_980); // 9,66 por mil de 3.000.000
    expect(r.netPayable).toBe(3_570_000 - 40_000 - 50_000 - 85_500 - 28_980);
  });

  it("no retiene nada a clientes sin retenciones", () => {
    const r = computeWithholdings(t, { income: false, vat: false, ica: false });
    expect(r.total).toBe(0);
    expect(r.netPayable).toBe(t.total);
  });
});

describe("weightedAverageCost", () => {
  it("pondera existencia y entrada", () => {
    expect(weightedAverageCost(10, 50_000, 10, 60_000)).toBe(55_000);
    expect(weightedAverageCost(3, 100_000, 1, 120_000)).toBe(105_000);
  });

  it("toma el costo de la entrada si no hay existencia", () => {
    expect(weightedAverageCost(0, 80_000, 5, 90_000)).toBe(90_000);
  });
});

describe("computeKardex", () => {
  const mov = (p: Partial<StockMovement>): StockMovement => ({
    id: "m",
    itemId: "i",
    date: "2026-01-01",
    type: "entrada",
    quantity: 0,
    unitCost: 0,
    reference: "ref",
    ...p,
  });

  it("valora salidas al costo promedio vigente", () => {
    const k = computeKardex([
      mov({ type: "entrada", quantity: 10, unitCost: 50_000 }),
      mov({ type: "salida", quantity: 4, unitCost: 999 }),
      mov({ type: "entrada", quantity: 6, unitCost: 62_000 }),
      mov({ type: "salida", quantity: 2 }),
    ]);
    expect(k[1].unitCost).toBe(50_000);
    expect(k[2].averageCost).toBe(56_000); // (6×50.000 + 6×62.000) / 12
    expect(k[3].unitCost).toBe(56_000);
    expect(k[3].balance).toBe(10);
    expect(k[3].balanceValue).toBe(560_000);
  });

  it("permite ajustes positivos y negativos", () => {
    const k = computeKardex([
      mov({ type: "entrada", quantity: 5, unitCost: 10_000 }),
      mov({ type: "ajuste", quantity: -1 }),
      mov({ type: "ajuste", quantity: 2 }),
    ]);
    expect(k.at(-1)?.balance).toBe(6);
    expect(k.at(-1)?.averageCost).toBe(10_000);
  });

  it("rechaza salidas sin existencia", () => {
    expect(() => computeKardex([mov({ type: "salida", quantity: 1, reference: "OT-1" })])).toThrow(/OT-1/);
  });
});

describe("computePnL", () => {
  it("calcula margen bruto, utilidad operativa y márgenes", () => {
    const p = computePnL({ revenue: 100_000_000, partsCost: 40_000_000, thirdPartyCost: 15_000_000, laborCost: 20_000_000, overheadCost: 10_000_000 });
    expect(p.grossMargin).toBe(45_000_000);
    expect(p.grossMarginPct).toBe(45);
    expect(p.operatingIncome).toBe(15_000_000);
    expect(p.operatingMarginPct).toBe(15);
  });

  it("muestra pérdidas como valores negativos", () => {
    const p = computePnL({ revenue: 10_000_000, partsCost: 6_000_000, thirdPartyCost: 0, laborCost: 3_000_000, overheadCost: 2_000_000 });
    expect(p.operatingIncome).toBe(-1_000_000);
    expect(p.operatingMarginPct).toBe(-10);
  });
});

describe("cartera", () => {
  it("cuenta días vencidos y asigna rango", () => {
    expect(daysOverdue("2026-10-01", "2026-10-09")).toBe(8);
    expect(daysOverdue("2026-10-20", "2026-10-09")).toBe(0);
    expect(agingBucket(0)).toBe("al_dia");
    expect(agingBucket(30)).toBe("1_30");
    expect(agingBucket(31)).toBe("31_60");
    expect(agingBucket(90)).toBe("61_90");
    expect(agingBucket(91)).toBe("mas_90");
  });

  it("calcula el saldo pendiente sin bajar de cero", () => {
    expect(outstanding(1_000_000, [{ amount: 400_000 }])).toBe(600_000);
    expect(outstanding(1_000_000, [{ amount: 1_200_000 }])).toBe(0);
  });
});
