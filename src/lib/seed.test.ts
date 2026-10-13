import { describe, expect, it } from "vitest";

import { computeKardex, computeTotals, computeWithholdings } from "./money";
import { createSeed } from "./seed";

describe("datos de prueba", () => {
  const db = createSeed("2026-10-13");

  it("se generan igual cada vez", () => {
    expect(createSeed("2026-10-13").workOrders.map((w) => w.code)).toEqual(db.workOrders.map((w) => w.code));
  });

  it("toda OT apunta a un vehículo del mismo cliente", () => {
    for (const wo of db.workOrders) {
      expect(db.vehicles.find((v) => v.id === wo.vehicleId)?.clientId).toBe(wo.clientId);
    }
  });

  it("cada OT entregada o facturada tiene exactamente una factura", () => {
    const done = db.workOrders.filter((w) => ["entregada", "facturada"].includes(w.status));
    expect(done.length).toBeGreaterThan(200);
    for (const wo of done) expect(db.invoices.filter((i) => i.workOrderId === wo.id)).toHaveLength(1);
  });

  it("la factura cuadra con las líneas de la OT y las retenciones del cliente", () => {
    for (const inv of db.invoices) {
      const wo = db.workOrders.find((w) => w.id === inv.workOrderId)!;
      const client = db.clients.find((c) => c.id === inv.clientId)!;
      const totals = computeTotals(wo.lines);
      expect(inv.total).toBe(totals.total);
      expect(inv.netPayable).toBe(computeWithholdings(totals, client.withholdings).netPayable);
      expect(inv.payments.reduce((s, p) => s + p.amount, 0)).toBeLessThanOrEqual(inv.netPayable);
    }
  });

  it("el inventario nunca queda en negativo y cuadra con el kárdex", () => {
    for (const item of db.inventory) {
      const kardex = computeKardex(db.movements.filter((m) => m.itemId === item.id));
      expect(kardex.at(-1)?.balance).toBe(item.stock);
      expect(item.stock).toBeGreaterThanOrEqual(0);
    }
  });

  it("los repuestos de cada OT se cuestan al promedio del kárdex", () => {
    const wo = db.workOrders.find((w) => w.status === "facturada" && w.lines.some((l) => l.kind === "part"))!;
    const part = wo.lines.find((l) => l.kind === "part")!;
    const exit = computeKardex(db.movements.filter((m) => m.itemId === part.itemId)).find((k) => k.type === "salida" && k.reference === wo.code)!;
    expect(part.unitCost).toBe(exit.unitCost);
  });

  it("cada línea de tercero corresponde a un trabajo de tercero con su margen", () => {
    for (const wo of db.workOrders) {
      for (const l of wo.lines.filter((x) => x.kind === "third_party")) {
        const job = db.thirdPartyJobs.find((j) => j.id === l.thirdPartyJobId)!;
        expect(job.workOrderId).toBe(wo.id);
        expect(l.unitCost).toBe(job.cost);
        expect(l.unitPrice).toBeGreaterThan(job.cost);
      }
    }
  });

  it("los vehículos de maquinaria registran horómetro", () => {
    const machines = db.vehicles.filter((v) => v.type === "Maquinaria");
    expect(machines.length).toBeGreaterThan(0);
    for (const m of machines) expect(m.hourMeter).toBeGreaterThan(0);
  });
});
