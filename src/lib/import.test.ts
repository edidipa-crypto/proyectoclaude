import { describe, expect, it } from "vitest";

import { autoMap, findHeaderRow, planImport, splitDocument, type ImportSnapshot } from "./import";
import { parseDate } from "./parse";

const empty: ImportSnapshot = { clients: [], vehicles: [], users: [{ id: "u-dueno", name: "Miller Wveimar Mesa Estrada" }], workOrderCodes: [] };
let n = 0;
const newId = (p: string) => `${p}-${++n}`;
const noVat = { pricesIncludeVat: false };

describe("lectura de valores", () => {
  it("entiende fechas como se escriben en Colombia y las de Excel", () => {
    expect(parseDate("15/03/2025")).toBe("2025-03-15");
    expect(parseDate("5-3-25")).toBe("2025-03-05");
    expect(parseDate("2025-03-15")).toBe("2025-03-15");
    expect(parseDate(new Date(Date.UTC(2025, 2, 15)))).toBe("2025-03-15");
    expect(parseDate(45731)).toBe("2025-03-15"); // número de serie de Excel
    expect(parseDate("31/02/2025")).toBeNull();
    expect(parseDate("ayer")).toBeNull();
  });

  it("separa el NIT del dígito de verificación", () => {
    expect(splitDocument("900.123.456-7")).toEqual({ number: "900123456", dv: 7 });
    expect(splitDocument("70417827")).toEqual({ number: "70417827" });
  });
});

describe("reconocimiento de columnas", () => {
  it("encuentra la fila de encabezados aunque haya un título arriba", () => {
    expect(findHeaderRow([["Listado de clientes 2025"], [], ["Razón social", "NIT", "Celular"], ["A", "1", "2"]])).toBe(2);
  });

  it("relaciona encabezados con otros nombres, sin tildes ni mayúsculas", () => {
    const m = autoMap("clients", ["RAZÓN SOCIAL", "Nit/CC", "Celular", "Correo electrónico", "Municipio"]);
    expect(m).toMatchObject({ name: 0, doc: 1, phone: 2, email: 3, city: 4 });
  });
});

describe("carga de clientes", () => {
  const headers = ["Cliente", "NIT", "Teléfono"];
  const rows = [
    ["Transportes La Montaña S.A.S.", "900.123.456-8", "310 555 1234"],
    ["José Pérez", "71234567", ""],
    ["José Pérez", "71234567", ""],
    ["", "123", ""],
  ];

  it("crea empresas con NIT y personas con cédula, y salta duplicados", () => {
    const plan = planImport("clients", rows, autoMap("clients", headers), empty, noVat, newId);
    expect(plan.clients).toHaveLength(2);
    expect(plan.clients[0]).toMatchObject({ kind: "empresa", idType: "NIT", idNumber: "900123456", dv: 8, phone: "3105551234" });
    expect(plan.clients[1]).toMatchObject({ kind: "persona", idType: "CC", idNumber: "71234567" });
    expect(plan.rows.map((r) => r.status)).toEqual(["nuevo", "nuevo", "existe", "error"]);
    expect(plan.rows[3].line).toBe(5);
  });

  it("no repite clientes que ya están en la herramienta", () => {
    const snapshot = { ...empty, clients: [{ id: "cl-1", name: "José Pérez", idNumber: "71234567" }] };
    const plan = planImport("clients", rows.slice(1, 2), autoMap("clients", headers), snapshot, noVat, newId);
    expect(plan.clients).toHaveLength(0);
    expect(plan.rows[0].status).toBe("existe");
  });
});

describe("carga de trabajos realizados", () => {
  const headers = ["Fecha", "Placa", "Cliente", "Trabajo realizado", "Valor", "Técnico"];

  it("crea la OT entregada con cliente y vehículo, y quita el IVA si los valores lo incluyen", () => {
    const rows = [["10/02/2025", "snk-482", "Transportes La Montaña SAS", "Reparación total del motor", "7.735.000", "Miller"]];
    const plan = planImport("workOrders", rows, autoMap("workOrders", headers), empty, { pricesIncludeVat: true }, newId);
    expect(plan.rows[0].status).toBe("nuevo");
    expect(plan.clients).toHaveLength(1);
    expect(plan.vehicles[0]).toMatchObject({ plate: "SNK482" });
    const wo = plan.workOrders[0];
    expect(wo).toMatchObject({ status: "entregada", openedAt: "2025-02-10", deliveredAt: "2025-02-10", technicianId: "u-dueno", code: "OT-2025-0101" });
    expect(wo.lines).toEqual([expect.objectContaining({ kind: "labor", unitPrice: 6_500_000, quantity: 1 })]);
    expect(plan.warnings[0]).toMatch(/no trae costos/);
  });

  it("usa el vehículo y el cliente existentes por placa", () => {
    const snapshot = { ...empty, clients: [{ id: "cl-1", name: "Otro nombre", idNumber: "1" }], vehicles: [{ id: "vh-1", plate: "SNK482", clientId: "cl-1" }], workOrderCodes: ["OT-2025-0150"] };
    const plan = planImport("workOrders", [["2025-03-01", "SNK482", "", "Servicio de escáner", "150000", ""]], autoMap("workOrders", headers), snapshot, noVat, newId);
    expect(plan.clients).toHaveLength(0);
    expect(plan.vehicles).toHaveLength(0);
    expect(plan.workOrders[0]).toMatchObject({ clientId: "cl-1", vehicleId: "vh-1", code: "OT-2025-0151" });
  });

  it("numera las OTs por año, siguiendo las que ya existen", () => {
    const snapshot = { ...empty, workOrderCodes: ["OT-2024-0300", "OT-2025-0150"] };
    const rows = [["2024-12-30", "", "José", "A", "100"], ["2025-01-02", "", "José", "B", "100"], ["2026-01-02", "", "José", "C", "100"]];
    const plan = planImport("workOrders", rows, autoMap("workOrders", headers), snapshot, noVat, newId);
    expect(plan.workOrders.map((w) => w.code)).toEqual(["OT-2024-0301", "OT-2025-0151", "OT-2026-0101"]);
  });

  it("separa mano de obra, repuestos y terceros cuando vienen en columnas", () => {
    const h = ["Fecha", "Cliente", "Descripción", "Mano de obra", "Repuestos", "Terceros", "Costo repuestos"];
    const plan = planImport("workOrders", [["01/04/2025", "José Pérez", "Bajada de culata", "1.200.000", "800.000", "350.000", "600.000"]], autoMap("workOrders", h), empty, noVat, newId);
    const kinds = plan.workOrders[0].lines.map((l) => [l.kind, l.unitPrice, l.unitCost]);
    expect(kinds).toEqual([["labor", 1_200_000, 0], ["part", 800_000, 600_000], ["third_party", 350_000, 0]]);
    expect(plan.vehicles[0].plate).toBe("SIN PLACA");
  });

  it("reporta filas con fecha o valor que no se entienden", () => {
    const plan = planImport("workOrders", [["ayer", "", "José", "Algo", "100", ""], ["01/01/2025", "", "José", "Algo", "", ""]], autoMap("workOrders", headers), empty, noVat, newId);
    expect(plan.rows.map((r) => r.status)).toEqual(["error", "error"]);
    expect(plan.workOrders).toHaveLength(0);
  });

  it("avisa si falta una columna obligatoria", () => {
    const plan = planImport("workOrders", [["x"]], autoMap("workOrders", ["Cliente"]), empty, noVat, newId);
    expect(plan.warnings[0]).toMatch(/Fecha/);
  });
});
