import { describe, expect, it } from "vitest";

import { createSeed } from "@/lib/seed";
import { assemble, disassemble, fromRow, parseNumber, TABLES, toRow, type TableName, type TableRows } from "./schema";

/** Simula escribir en la hoja y volver a leer: objeto → fila → objeto. */
function throughSheet(rows: TableRows): TableRows {
  const out = {} as TableRows;
  for (const name of Object.keys(TABLES) as TableName[]) {
    const table = TABLES[name];
    const headers = table.columns.map((c) => c[0]);
    out[name] = rows[name].map((r) => fromRow(table, headers, toRow(table, r)));
  }
  return out;
}

describe("Google Sheets: conversión de datos", () => {
  it("guardar y volver a leer la base de datos completa no cambia nada", () => {
    const db = createSeed("2026-10-13");
    const back = assemble(throughSheet(disassemble(db)));
    // Las facturas se reordenan por fecha al leer; se compara el contenido.
    const byId = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => a.id.localeCompare(b.id));
    expect({ ...back, invoices: byId(back.invoices) }).toEqual({ ...db, invoices: byId(db.invoices) });
  });

  it("encuentra las columnas por su encabezado aunque estén en otro orden", () => {
    const table = TABLES.clients;
    const client = createSeed("2026-10-13").clients[0];
    const shuffled = table.columns.map((c) => c[0]).reverse();
    const row = toRow(table, client as unknown as Record<string, unknown>, shuffled);
    expect(fromRow(table, shuffled, row)).toEqual(client);
  });

  it("ignora columnas extra que agregue una persona en la hoja", () => {
    const table = TABLES.expenses;
    const headers = ["id", "fecha", "notas internas", "categoria", "descripcion", "valor"];
    const row = ["gs-1", "2026-10-01", "lo pagó Miller", "Arriendo", "Arriendo taller", 2_500_000];
    expect(fromRow(table, headers, row)).toEqual({ id: "gs-1", date: "2026-10-01", category: "Arriendo", description: "Arriendo taller", amount: 2_500_000 });
  });

  it("guarda sí/no como SI/NO y entiende variantes escritas a mano", () => {
    const table = TABLES.clients;
    const headers = table.columns.map((c) => c[0]);
    const row = toRow(table, { id: "c", withholdings: { income: true, vat: false, ica: false } }, headers);
    expect(row[headers.indexOf("retefuente")]).toBe("SI");
    expect(row[headers.indexOf("reteiva")]).toBe("NO");
    const read = fromRow(table, headers, headers.map((h) => (h === "retefuente" ? "sí" : h === "reteica" ? "x" : "")));
    expect(read.withholdings).toEqual({ income: true, vat: false, ica: true });
  });

  it("entiende números escritos como en Colombia", () => {
    expect(parseNumber(1_500_000)).toBe(1_500_000);
    expect(parseNumber("$ 1.500.000")).toBe(1_500_000);
    expect(parseNumber("6.500.000")).toBe(6_500_000);
    expect(parseNumber("2,5")).toBe(2.5);
    expect(parseNumber("2.5")).toBe(2.5);
    expect(parseNumber("150000")).toBe(150_000);
    expect(parseNumber("abc")).toBe(0);
  });

  it("no se cae si un inventario editado a mano queda en negativo", () => {
    const db = createSeed("2026-10-13");
    const rows = disassemble(db);
    const item = rows.inventory[0];
    rows.movements = [{ id: "m1", itemId: item.id, date: "2026-01-01", type: "salida", quantity: 3, unitCost: 0, reference: "OT-x" }];
    const result = assemble(rows).inventory.find((i) => i.id === item.id)!;
    expect(result.stock).toBe(-3);
  });
});
