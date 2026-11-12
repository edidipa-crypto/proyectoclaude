import { computeKardex, computeTotals, daysOverdue, outstanding } from "@/lib/money";
import { lastMonths, monthLabel, monthOf, todayBogota } from "@/lib/dates";
import { createSeed, type Database } from "@/lib/seed";
import { sheetsConfig } from "@/lib/sheets/client";
import { appendRows, loadDatabase, updateRow } from "@/lib/sheets/store";
import { formatNit } from "@/lib/validation";
import type { Client, MonthlyFinancials, Vehicle, WorkOrder, WorkOrderPriority, WorkOrderRecord, WorkOrderStatus } from "@/types";

// ---------------------------------------------------------------------------
// Capa de acceso a datos. Dos modos:
//  - "sheets": datos reales en Google Sheets, si GOOGLE_SHEETS_ID y la cuenta de
//    servicio están configuradas.
//  - "demo": datos de prueba en memoria del servidor (se reinician al apagarlo).
// Las páginas no saben en qué modo están.
// ---------------------------------------------------------------------------

const memory = globalThis as unknown as { __dieselproDb?: Database };

async function db(): Promise<Database> {
  const config = sheetsConfig();
  if (config) return loadDatabase(config);
  memory.__dieselproDb ??= createSeed();
  return memory.__dieselproDb;
}

export function dataMode(): "sheets" | "demo" {
  return sheetsConfig() ? "sheets" : "demo";
}

export const today = () => todayBogota();

// --- Usuarios ------------------------------------------------------------------

export async function getUsers() {
  return (await db()).users;
}

export async function getUser(id: string) {
  return (await db()).users.find((u) => u.id === id);
}

/** Usuario por correo (sin importar mayúsculas), para iniciar sesión. */
export async function findUserByEmail(email: string) {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return undefined;
  return (await db()).users.find((u) => u.email.trim().toLowerCase() === wanted);
}

export async function setUserPassword(userId: string, passwordHash: string) {
  const d = await db();
  const user = d.users.find((u) => u.id === userId);
  if (!user) throw new Error("Usuario no encontrado");
  const config = sheetsConfig();
  if (config) await updateRow(config, "users", { ...user, passwordHash } as unknown as Plain & { id: string });
  else user.passwordHash = passwordHash;
}

// --- Clientes y vehículos --------------------------------------------------------

export function clientDocument(c: Client) {
  return c.idType === "NIT" ? `NIT ${formatNit(c.idNumber, c.dv)}` : `CC ${formatNit(c.idNumber)}`;
}

export async function getClients() {
  return (await db()).clients;
}

export async function getClient(id: string) {
  return (await db()).clients.find((c) => c.id === id);
}

export async function getVehicles() {
  return (await db()).vehicles;
}

export async function getVehicle(id: string) {
  return (await db()).vehicles.find((v) => v.id === id);
}

// --- Órdenes de trabajo ----------------------------------------------------------

function toRow(d: Database, wo: WorkOrderRecord): WorkOrder {
  const client = d.clients.find((c) => c.id === wo.clientId);
  const totals = computeTotals(wo.lines);
  return {
    id: wo.id,
    code: wo.code,
    clientId: wo.clientId,
    client: client?.name ?? "Cliente no encontrado",
    clientNit: !client ? "" : client.idType === "NIT" ? formatNit(client.idNumber, client.dv) : formatNit(client.idNumber),
    vehicle: d.vehicles.find((v) => v.id === wo.vehicleId) ?? { id: wo.vehicleId, clientId: wo.clientId, plate: "¿?", brand: "", model: "", engine: "", year: 0, odometerKm: 0, type: "Camión" },
    service: wo.service,
    status: wo.status,
    priority: wo.priority,
    technician: d.users.find((u) => u.id === wo.technicianId)?.name ?? "Por asignar",
    openedAt: wo.openedAt,
    promisedAt: wo.promisedAt,
    laborAmount: totals.byKind.labor,
    partsAmount: totals.byKind.part,
    thirdPartyAmount: totals.byKind.third_party,
  };
}

/** Filas para la tabla de OTs, de la más reciente a la más antigua. */
export async function getWorkOrders() {
  const d = await db();
  return d.workOrders.map((wo) => toRow(d, wo));
}

export async function getWorkOrderRecords() {
  return (await db()).workOrders;
}

export async function getWorkOrder(id: string) {
  const d = await db();
  const wo = d.workOrders.find((w) => w.id === id);
  if (!wo) return undefined;
  const client = d.clients.find((c) => c.id === wo.clientId);
  const vehicle = d.vehicles.find((v) => v.id === wo.vehicleId);
  if (!client || !vehicle) return undefined;
  return {
    ...wo,
    client,
    vehicle,
    technician: d.users.find((u) => u.id === wo.technicianId),
    invoice: d.invoices.find((i) => i.workOrderId === wo.id),
    thirdPartyJobs: d.thirdPartyJobs.filter((j) => j.workOrderId === wo.id),
    totals: computeTotals(wo.lines),
  };
}

// --- Inventario, terceros y proveedores --------------------------------------------

export async function getInventory() {
  return (await db()).inventory;
}

export async function getInventoryItem(id: string) {
  const d = await db();
  const item = d.inventory.find((i) => i.id === id);
  if (!item) return undefined;
  return { item, kardex: computeKardex(d.movements.filter((m) => m.itemId === id)) };
}

export async function getProviders() {
  return (await db()).providers;
}

export async function getThirdPartyJobs() {
  return (await db()).thirdPartyJobs;
}

export async function getPayables() {
  const { payables, providers } = await db();
  return payables.flatMap((p) => {
    const provider = providers.find((x) => x.id === p.providerId);
    if (!provider) return [];
    const balance = outstanding(p.amount, p.payments);
    return [{ ...p, provider, balance, daysOverdue: balance > 0 ? daysOverdue(p.dueDate, today()) : 0 }];
  });
}

// --- Facturación y cartera ------------------------------------------------------------

export async function getInvoices() {
  return (await db()).invoices;
}

/** Facturas emitidas con su saldo y días de mora. */
export async function getReceivables() {
  const { invoices, clients, workOrders } = await db();
  return invoices
    .filter((i) => i.number && i.dianStatus !== "rechazado")
    .flatMap((i) => {
      const client = clients.find((c) => c.id === i.clientId);
      const workOrder = workOrders.find((w) => w.id === i.workOrderId);
      if (!client || !workOrder) return [];
      const balance = outstanding(i.netPayable, i.payments);
      return [{ ...i, client, workOrder, balance, daysOverdue: balance > 0 && i.dueDate ? daysOverdue(i.dueDate, today()) : 0 }];
    });
}

export async function getExpenses() {
  return (await db()).expenses;
}

/**
 * Resultados por mes cerrado (sin el mes en curso), a partir de las OTs entregadas
 * y los gastos. La mano de obra es la nómina de técnicos; el resto son gastos generales.
 */
export async function getMonthlyFinancials(months = 12): Promise<MonthlyFinancials[]> {
  const { workOrders, expenses } = await db();
  const closed = lastMonths(today(), months + 1).slice(0, -1);
  return closed.map((month) => {
    let revenue = 0;
    let dieselPartsCost = 0;
    let thirdPartyCost = 0;
    for (const wo of workOrders) {
      if (!wo.deliveredAt || monthOf(wo.deliveredAt) !== month) continue;
      const t = computeTotals(wo.lines);
      revenue += t.subtotal;
      dieselPartsCost += t.costByKind.part;
      thirdPartyCost += t.costByKind.third_party;
    }
    let laborCost = 0;
    let overheadCost = 0;
    for (const e of expenses) {
      if (monthOf(e.date) !== month) continue;
      if (e.category === "Nómina técnicos") laborCost += e.amount;
      else overheadCost += e.amount;
    }
    return { month, label: monthLabel(month), revenue, dieselPartsCost, thirdPartyCost, laborCost, overheadCost };
  });
}

// --- Escrituras -------------------------------------------------------------------------

let sequence = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(++sequence).toString(36)}`;

type Plain = Record<string, unknown>;

export async function createClient(data: Omit<Client, "id">) {
  const client: Client = { ...data, id: newId("cl") };
  const config = sheetsConfig();
  if (config) await appendRows(config, "clients", [client as unknown as Plain]);
  else (await db()).clients.unshift(client);
  return client;
}

export async function createVehicle(data: Omit<Vehicle, "id">) {
  const vehicle: Vehicle = { ...data, id: newId("vh") };
  const config = sheetsConfig();
  if (config) await appendRows(config, "vehicles", [vehicle as unknown as Plain]);
  else (await db()).vehicles.unshift(vehicle);
  return vehicle;
}

export async function createWorkOrder(
  data: { vehicleId: string; technicianId: string; odometerKm: number; priority: WorkOrderPriority; symptoms: string },
  userId: string,
) {
  const d = await db();
  const vehicle = d.vehicles.find((v) => v.id === data.vehicleId);
  if (!vehicle) throw new Error("Vehículo no encontrado");
  const year = today().slice(0, 4);
  const last = Math.max(100, ...d.workOrders.filter((w) => w.code.startsWith(`OT-${year}-`)).map((w) => Number(w.code.slice(-4)) || 0));
  const isMachine = vehicle.type === "Maquinaria";
  const event = { at: new Date().toISOString(), status: "recibida" as const, userId };
  const wo: WorkOrderRecord = {
    id: newId("wo"),
    code: `OT-${year}-${String(last + 1).padStart(4, "0")}`,
    clientId: vehicle.clientId,
    vehicleId: vehicle.id,
    technicianId: data.technicianId,
    service: data.symptoms,
    symptoms: data.symptoms,
    status: "recibida",
    priority: data.priority,
    openedAt: today(),
    promisedAt: today(),
    // En maquinaria la lectura es el horómetro
    odometerKm: isMachine ? 0 : data.odometerKm,
    ...(isMachine ? { hourMeter: data.odometerKm } : {}),
    lines: [],
    history: [event],
  };
  const updatedVehicle: Vehicle = isMachine
    ? { ...vehicle, hourMeter: Math.max(vehicle.hourMeter ?? 0, data.odometerKm) }
    : { ...vehicle, odometerKm: Math.max(vehicle.odometerKm, data.odometerKm) };

  const config = sheetsConfig();
  if (config) {
    const { lines: _l, history: _h, ...row } = wo;
    await appendRows(config, "workOrders", [row as unknown as Plain]);
    await appendRows(config, "history", [{ ...event, workOrderId: wo.id }]);
    await updateRow(config, "vehicles", updatedVehicle as unknown as Plain & { id: string });
  } else {
    Object.assign(vehicle, updatedVehicle);
    d.workOrders.unshift(wo);
  }
  return wo;
}

/** Lo mínimo que necesita la carga de archivos para no duplicar registros. */
export async function getImportSnapshot() {
  const d = await db();
  return {
    clients: d.clients.map((c) => ({ id: c.id, name: c.name, idNumber: c.idNumber })),
    vehicles: d.vehicles.map((v) => ({ id: v.id, plate: v.plate, clientId: v.clientId })),
    users: d.users.map((u) => ({ id: u.id, name: u.name })),
    workOrderCodes: d.workOrders.map((w) => w.code),
  };
}

/** Guarda en bloque lo que preparó la carga de archivos. */
export async function saveImported(records: { clients: Client[]; vehicles: Vehicle[]; workOrders: WorkOrderRecord[] }) {
  const config = sheetsConfig();
  if (config) {
    const plain = <T,>(list: T[]) => list as unknown as Plain[];
    if (records.clients.length) await appendRows(config, "clients", plain(records.clients));
    if (records.vehicles.length) await appendRows(config, "vehicles", plain(records.vehicles));
    if (records.workOrders.length) {
      await appendRows(config, "workOrders", records.workOrders.map(({ lines: _l, history: _h, ...w }) => w as unknown as Plain));
      await appendRows(config, "lines", records.workOrders.flatMap((w) => w.lines.map((l) => ({ ...l, workOrderId: w.id }))));
      await appendRows(config, "history", records.workOrders.flatMap((w) => w.history.map((h) => ({ ...h, workOrderId: w.id }))));
    }
    return;
  }
  const d = await db();
  d.clients.unshift(...records.clients);
  d.vehicles.unshift(...records.vehicles);
  d.workOrders.push(...records.workOrders);
  d.workOrders.sort((a, b) => b.openedAt.localeCompare(a.openedAt) || b.code.localeCompare(a.code));
}

export async function changeWorkOrderStatus(id: string, status: WorkOrderStatus, userId: string, note?: string) {
  const d = await db();
  const wo = d.workOrders.find((w) => w.id === id);
  if (!wo) throw new Error("OT no encontrada");
  const event = { at: new Date().toISOString(), status, userId, ...(note ? { note } : {}) };
  const updated: WorkOrderRecord = { ...wo, status, ...(status === "entregada" ? { deliveredAt: today() } : {}) };

  const config = sheetsConfig();
  if (config) {
    const { lines: _l, history: _h, ...row } = updated;
    await updateRow(config, "workOrders", row as unknown as Plain & { id: string });
    await appendRows(config, "history", [{ ...event, workOrderId: id }]);
  } else {
    Object.assign(wo, updated);
    wo.history.push(event);
  }
  return updated;
}
