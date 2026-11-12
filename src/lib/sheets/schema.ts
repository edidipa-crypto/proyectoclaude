// ---------------------------------------------------------------------------
// Estructura de la hoja de Google Sheets: una pestaña por tema, encabezados en
// español en la fila 1 y un registro por fila. Las columnas se reconocen por el
// nombre del encabezado, así que se pueden reordenar sin romper nada.
// ---------------------------------------------------------------------------

import { computeKardex, type StockMovement } from "@/lib/money";
import { parseNumber } from "@/lib/parse";
import type { Database } from "@/lib/seed";
import type {
  AppUser,
  Client,
  Expense,
  InventoryItem,
  Invoice,
  Payable,
  Payment,
  ThirdPartyJob,
  ThirdPartyProvider,
  Vehicle,
  WorkOrderEvent,
  WorkOrderLine,
  WorkOrderRecord,
} from "@/types";

type Kind = "text" | "optText" | "number" | "optNumber" | "bool";
/** [encabezado en la hoja, campo del objeto (admite "a.b"), tipo] */
export type Column = readonly [string, string, Kind];

export interface Table {
  tab: string;
  columns: readonly Column[];
}

export const TABLES = {
  users: {
    tab: "Usuarios",
    columns: [["id", "id", "text"], ["nombre", "name", "text"], ["correo", "email", "text"], ["rol", "role", "text"], ["telefono", "phone", "text"], ["activo", "active", "bool"]],
  },
  clients: {
    tab: "Clientes",
    columns: [
      ["id", "id", "text"], ["tipo", "kind", "text"], ["nombre", "name", "text"], ["tipo_documento", "idType", "text"], ["documento", "idNumber", "text"], ["dv", "dv", "optNumber"],
      ["contacto", "contactName", "optText"], ["telefono", "phone", "text"], ["correo_factura", "billingEmail", "text"], ["ciudad", "city", "text"], ["direccion", "address", "text"],
      ["plazo_dias", "paymentTermDays", "number"], ["retefuente", "withholdings.income", "bool"], ["reteiva", "withholdings.vat", "bool"], ["reteica", "withholdings.ica", "bool"],
    ],
  },
  vehicles: {
    tab: "Vehiculos",
    columns: [
      ["id", "id", "text"], ["cliente_id", "clientId", "text"], ["placa", "plate", "text"], ["marca", "brand", "text"], ["modelo", "model", "text"], ["motor", "engine", "text"],
      ["anio", "year", "number"], ["tipo", "type", "text"], ["kilometraje", "odometerKm", "number"], ["horometro", "hourMeter", "optNumber"],
    ],
  },
  workOrders: {
    tab: "OTs",
    columns: [
      ["id", "id", "text"], ["codigo", "code", "text"], ["cliente_id", "clientId", "text"], ["vehiculo_id", "vehicleId", "text"], ["tecnico_id", "technicianId", "optText"],
      ["servicio", "service", "text"], ["sintomas", "symptoms", "text"], ["diagnostico", "diagnosis", "optText"], ["estado", "status", "text"], ["prioridad", "priority", "text"],
      ["fecha_ingreso", "openedAt", "text"], ["fecha_promesa", "promisedAt", "text"], ["fecha_entrega", "deliveredAt", "optText"], ["kilometraje", "odometerKm", "number"], ["horometro", "hourMeter", "optNumber"],
    ],
  },
  lines: {
    tab: "Lineas_OT",
    columns: [
      ["id", "id", "text"], ["ot_id", "workOrderId", "text"], ["tipo", "kind", "text"], ["descripcion", "description", "text"], ["cantidad", "quantity", "number"],
      ["precio_unitario", "unitPrice", "number"], ["costo_unitario", "unitCost", "number"], ["iva_pct", "taxRate", "number"], ["descuento_pct", "discountPct", "number"],
      ["repuesto_id", "itemId", "optText"], ["trabajo_tercero_id", "thirdPartyJobId", "optText"],
    ],
  },
  history: {
    tab: "Historial_OT",
    columns: [["ot_id", "workOrderId", "text"], ["fecha_hora", "at", "text"], ["estado", "status", "text"], ["usuario_id", "userId", "text"], ["nota", "note", "optText"]],
  },
  inventory: {
    tab: "Repuestos",
    columns: [
      ["id", "id", "text"], ["sku", "sku", "text"], ["nombre", "name", "text"], ["categoria", "category", "text"], ["ref_oem", "oemRef", "text"], ["marca", "brand", "text"],
      ["unidad", "unit", "text"], ["ubicacion", "location", "text"], ["minimo", "minStock", "number"], ["precio_venta", "salePrice", "number"],
    ],
  },
  movements: {
    tab: "Movimientos_inventario",
    columns: [["id", "id", "text"], ["repuesto_id", "itemId", "text"], ["fecha", "date", "text"], ["tipo", "type", "text"], ["cantidad", "quantity", "number"], ["costo_unitario", "unitCost", "number"], ["referencia", "reference", "text"]],
  },
  providers: {
    tab: "Proveedores",
    columns: [["id", "id", "text"], ["nombre", "name", "text"], ["nit", "nit", "text"], ["tipo", "type", "text"], ["ciudad", "city", "text"], ["contacto", "contact", "text"], ["telefono", "phone", "text"], ["plazo_dias", "paymentTermDays", "number"]],
  },
  thirdPartyJobs: {
    tab: "Trabajos_terceros",
    columns: [
      ["id", "id", "text"], ["ot_id", "workOrderId", "optText"], ["proveedor_id", "providerId", "text"], ["descripcion", "description", "text"], ["costo", "cost", "number"],
      ["margen_pct", "markupPct", "number"], ["estado", "status", "text"], ["fecha_envio", "sentAt", "text"], ["fecha_estimada", "expectedAt", "text"], ["factura_proveedor", "invoiceRef", "optText"],
    ],
  },
  invoices: {
    tab: "Facturas",
    columns: [
      ["id", "id", "text"], ["numero", "number", "optText"], ["ot_id", "workOrderId", "text"], ["cliente_id", "clientId", "text"], ["subtotal", "subtotal", "number"], ["iva", "tax", "number"],
      ["total", "total", "number"], ["neto_a_pagar", "netPayable", "number"], ["estado_dian", "dianStatus", "text"], ["cufe", "cufe", "optText"], ["fecha", "issuedAt", "optText"],
      ["vencimiento", "dueDate", "optText"], ["mensaje", "message", "optText"],
    ],
  },
  invoicePayments: {
    tab: "Pagos_clientes",
    columns: [["factura_id", "invoiceId", "text"], ["fecha", "date", "text"], ["valor", "amount", "number"], ["medio", "method", "text"]],
  },
  payables: {
    tab: "Cuentas_por_pagar",
    columns: [["id", "id", "text"], ["proveedor_id", "providerId", "text"], ["factura_proveedor", "invoiceRef", "text"], ["fecha", "date", "text"], ["vencimiento", "dueDate", "text"], ["concepto", "concept", "text"], ["valor", "amount", "number"]],
  },
  payablePayments: {
    tab: "Pagos_proveedores",
    columns: [["cuenta_id", "payableId", "text"], ["fecha", "date", "text"], ["valor", "amount", "number"], ["medio", "method", "text"]],
  },
  expenses: {
    tab: "Gastos",
    columns: [["id", "id", "text"], ["fecha", "date", "text"], ["categoria", "category", "text"], ["descripcion", "description", "text"], ["valor", "amount", "number"]],
  },
} as const satisfies Record<string, Table>;

export type TableName = keyof typeof TABLES;
export type Cell = string | number | boolean;
export type TableRows = Record<TableName, Record<string, unknown>[]>;

// --- Conversión celda <-> valor -------------------------------------------------

const YES = new Set(["SI", "SÍ", "TRUE", "VERDADERO", "1", "X"]);

export function encodeCell(value: unknown, kind: Kind): Cell {
  if (value === undefined || value === null) return "";
  if (kind === "bool") return value ? "SI" : "NO";
  if (kind === "number" || kind === "optNumber") return Number(value);
  return String(value);
}

export function decodeCell(value: unknown, kind: Kind): unknown {
  const empty = value === undefined || value === null || value === "";
  switch (kind) {
    case "text":
      return empty ? "" : String(value);
    case "optText":
      return empty ? undefined : String(value);
    case "number":
      return empty ? 0 : parseNumber(value);
    case "optNumber":
      return empty ? undefined : parseNumber(value);
    case "bool":
      return value === true || YES.has(String(value).trim().toUpperCase());
  }
}

export { parseNumber };

function getPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let target = obj;
  for (const k of keys.slice(0, -1)) target = (target[k] ??= {}) as Record<string, unknown>;
  target[keys.at(-1)!] = value;
}

/** Objeto → fila, en el orden de los encabezados que tenga la hoja. */
export function toRow(table: Table, obj: Record<string, unknown>, headers: readonly string[] = table.columns.map((c) => c[0])): Cell[] {
  return headers.map((h) => {
    const col = table.columns.find((c) => c[0] === h);
    return col ? encodeCell(getPath(obj, col[1]), col[2]) : "";
  });
}

/** Fila → objeto, usando los encabezados para ubicar cada columna. */
export function fromRow(table: Table, headers: readonly string[], row: readonly unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [header, path, kind] of table.columns) {
    const i = headers.indexOf(header);
    const value = decodeCell(i >= 0 ? row[i] : undefined, kind);
    if (value !== undefined) setPath(obj, path, value);
  }
  return obj;
}

// --- Tablas planas <-> base de datos ------------------------------------------------

/** Arma la base de datos completa a partir de las filas de cada pestaña. */
export function assemble(rows: TableRows): Database {
  const by = <T>(list: Record<string, unknown>[], key: string) => {
    const map = new Map<string, T[]>();
    for (const r of list) {
      const id = String(r[key]);
      const { [key]: _, ...rest } = r;
      map.set(id, [...(map.get(id) ?? []), rest as T]);
    }
    return map;
  };
  const lines = by<WorkOrderLine>(rows.lines, "workOrderId");
  const history = by<WorkOrderEvent>(rows.history, "workOrderId");
  const invoicePayments = by<Payment>(rows.invoicePayments, "invoiceId");
  const payablePayments = by<Payment>(rows.payablePayments, "payableId");

  const movements = (rows.movements as unknown as StockMovement[]).slice().sort((a, b) => a.date.localeCompare(b.date) || (a.type === "entrada" ? -1 : 0) - (b.type === "entrada" ? -1 : 0));
  const inventory = (rows.inventory as unknown as InventoryItem[]).map((item) => {
    const own = movements.filter((m) => m.itemId === item.id);
    try {
      const kardex = computeKardex(own);
      return { ...item, stock: kardex.at(-1)?.balance ?? 0, unitCost: kardex.at(-1)?.averageCost ?? 0 };
    } catch {
      // Datos editados a mano que dejan el saldo en negativo: se muestra el saldo tal cual
      // para que se vea el problema, en vez de tumbar toda la aplicación.
      const stock = own.reduce((s, m) => s + (m.type === "salida" ? -m.quantity : m.quantity), 0);
      const lastIn = own.filter((m) => m.type === "entrada").at(-1);
      return { ...item, stock, unitCost: lastIn?.unitCost ?? 0 };
    }
  });

  return {
    users: rows.users as unknown as AppUser[],
    clients: rows.clients as unknown as Client[],
    vehicles: rows.vehicles as unknown as Vehicle[],
    inventory,
    movements,
    providers: rows.providers as unknown as ThirdPartyProvider[],
    thirdPartyJobs: (rows.thirdPartyJobs as unknown as ThirdPartyJob[]).map((j) => ({ ...j, workOrderId: j.workOrderId ?? null })),
    workOrders: (rows.workOrders as unknown as WorkOrderRecord[])
      .map((w) => ({ ...w, technicianId: w.technicianId ?? null, lines: lines.get(w.id) ?? [], history: history.get(w.id) ?? [] }))
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt) || b.code.localeCompare(a.code)),
    invoices: (rows.invoices as unknown as Invoice[])
      .map((i) => ({ ...i, number: i.number ?? null, cufe: i.cufe ?? null, issuedAt: i.issuedAt ?? null, dueDate: i.dueDate ?? null, payments: invoicePayments.get(i.id) ?? [] }))
      .sort((a, b) => (b.issuedAt ?? "9999").localeCompare(a.issuedAt ?? "9999")),
    payables: (rows.payables as unknown as Payable[]).map((p) => ({ ...p, payments: payablePayments.get(p.id) ?? [] })).sort((a, b) => b.date.localeCompare(a.date)),
    expenses: (rows.expenses as unknown as Expense[]).slice().sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** Separa la base de datos en filas planas, una lista por pestaña. */
export function disassemble(db: Database): TableRows {
  const plain = <T extends object>(list: T[]) => list as unknown as Record<string, unknown>[];
  return {
    users: plain(db.users),
    clients: plain(db.clients),
    vehicles: plain(db.vehicles),
    workOrders: db.workOrders.map(({ lines: _l, history: _h, ...w }) => w),
    lines: db.workOrders.flatMap((w) => w.lines.map((l) => ({ ...l, workOrderId: w.id }))),
    history: db.workOrders.flatMap((w) => w.history.map((h) => ({ ...h, workOrderId: w.id }))),
    inventory: db.inventory.map(({ stock: _s, unitCost: _c, ...i }) => i),
    movements: plain(db.movements),
    providers: plain(db.providers),
    thirdPartyJobs: plain(db.thirdPartyJobs),
    invoices: db.invoices.map(({ payments: _p, ...i }) => i),
    invoicePayments: db.invoices.flatMap((i) => i.payments.map((p) => ({ ...p, invoiceId: i.id }))),
    payables: db.payables.map(({ payments: _p, ...p }) => p),
    payablePayments: db.payables.flatMap((p) => p.payments.map((x) => ({ ...x, payableId: p.id }))),
    expenses: plain(db.expenses),
  };
}
