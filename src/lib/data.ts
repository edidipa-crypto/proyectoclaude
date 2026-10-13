import { computeKardex, computeTotals, daysOverdue, outstanding } from "@/lib/money";
import { lastMonths, monthLabel, monthOf, todayBogota } from "@/lib/dates";
import { createSeed, type Database } from "@/lib/seed";
import { formatNit } from "@/lib/validation";
import type { Client, MonthlyFinancials, WorkOrder, WorkOrderPriority, WorkOrderRecord, WorkOrderStatus } from "@/types";

// ---------------------------------------------------------------------------
// Capa de acceso a datos. Hoy trabaja sobre los datos de prueba en memoria del
// servidor (se reinician al apagarlo). En la Fase 1 cada función pasa a consultar
// Supabase sin tocar las páginas, p. ej.:
//
//   const supabase = createClient();
//   const { data } = await supabase.from("monthly_pnl").select("*");
// ---------------------------------------------------------------------------

const store = globalThis as unknown as { __dieselproDb?: Database };

function db(): Database {
  store.__dieselproDb ??= createSeed();
  return store.__dieselproDb;
}

export const today = () => todayBogota();

// --- Usuarios ------------------------------------------------------------------

export async function getUsers() {
  return db().users;
}

export async function getUser(id: string) {
  return db().users.find((u) => u.id === id);
}

// --- Clientes y vehículos --------------------------------------------------------

export function clientDocument(c: Client) {
  return c.idType === "NIT" ? `NIT ${formatNit(c.idNumber, c.dv)}` : `CC ${formatNit(c.idNumber)}`;
}

export async function getClients() {
  return db().clients;
}

export async function getClient(id: string) {
  return db().clients.find((c) => c.id === id);
}

export async function getVehicles() {
  return db().vehicles;
}

export async function getVehicle(id: string) {
  return db().vehicles.find((v) => v.id === id);
}

// --- Órdenes de trabajo ----------------------------------------------------------

function toRow(wo: WorkOrderRecord): WorkOrder {
  const { clients, vehicles, users } = db();
  const client = clients.find((c) => c.id === wo.clientId)!;
  const totals = computeTotals(wo.lines);
  return {
    id: wo.id,
    code: wo.code,
    clientId: client.id,
    client: client.name,
    clientNit: client.idType === "NIT" ? formatNit(client.idNumber, client.dv) : formatNit(client.idNumber),
    vehicle: vehicles.find((v) => v.id === wo.vehicleId)!,
    service: wo.service,
    status: wo.status,
    priority: wo.priority,
    technician: users.find((u) => u.id === wo.technicianId)?.name ?? "Por asignar",
    openedAt: wo.openedAt,
    promisedAt: wo.promisedAt,
    laborAmount: totals.byKind.labor,
    partsAmount: totals.byKind.part,
    thirdPartyAmount: totals.byKind.third_party,
  };
}

/** Filas para la tabla de OTs, de la más reciente a la más antigua. */
export async function getWorkOrders() {
  return db().workOrders.map(toRow);
}

export async function getWorkOrderRecords() {
  return db().workOrders;
}

export async function getWorkOrder(id: string) {
  const d = db();
  const wo = d.workOrders.find((w) => w.id === id);
  if (!wo) return undefined;
  return {
    ...wo,
    client: d.clients.find((c) => c.id === wo.clientId)!,
    vehicle: d.vehicles.find((v) => v.id === wo.vehicleId)!,
    technician: d.users.find((u) => u.id === wo.technicianId),
    invoice: d.invoices.find((i) => i.workOrderId === wo.id),
    thirdPartyJobs: d.thirdPartyJobs.filter((j) => j.workOrderId === wo.id),
    totals: computeTotals(wo.lines),
  };
}

// --- Inventario, terceros y proveedores --------------------------------------------

export async function getInventory() {
  return db().inventory;
}

export async function getInventoryItem(id: string) {
  const item = db().inventory.find((i) => i.id === id);
  if (!item) return undefined;
  return { item, kardex: computeKardex(db().movements.filter((m) => m.itemId === id)) };
}

export async function getProviders() {
  return db().providers;
}

export async function getThirdPartyJobs() {
  return db().thirdPartyJobs;
}

export async function getPayables() {
  const { payables, providers } = db();
  return payables.map((p) => {
    const balance = outstanding(p.amount, p.payments);
    return { ...p, provider: providers.find((x) => x.id === p.providerId)!, balance, daysOverdue: balance > 0 ? daysOverdue(p.dueDate, today()) : 0 };
  });
}

// --- Facturación y cartera ------------------------------------------------------------

export async function getInvoices() {
  return db().invoices;
}

/** Facturas emitidas con su saldo y días de mora. */
export async function getReceivables() {
  const { invoices, clients, workOrders } = db();
  return invoices
    .filter((i) => i.number && i.dianStatus !== "rechazado")
    .map((i) => {
      const balance = outstanding(i.netPayable, i.payments);
      return {
        ...i,
        client: clients.find((c) => c.id === i.clientId)!,
        workOrder: workOrders.find((w) => w.id === i.workOrderId)!,
        balance,
        daysOverdue: balance > 0 && i.dueDate ? daysOverdue(i.dueDate, today()) : 0,
      };
    });
}

export async function getExpenses() {
  return db().expenses;
}

/**
 * Resultados por mes cerrado (sin el mes en curso), a partir de las OTs entregadas
 * y los gastos. La mano de obra es la nómina de técnicos; el resto son gastos generales.
 */
export async function getMonthlyFinancials(months = 12): Promise<MonthlyFinancials[]> {
  const { workOrders, expenses } = db();
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
const newId = (prefix: string) => `${prefix}-n${Date.now().toString(36)}${++sequence}`;

export async function createClient(data: Omit<Client, "id">) {
  const client = { ...data, id: newId("cl") };
  db().clients.unshift(client);
  return client;
}

export async function createWorkOrder(
  data: { vehicleId: string; technicianId: string; odometerKm: number; priority: WorkOrderPriority; symptoms: string },
  userId: string,
) {
  const d = db();
  const vehicle = d.vehicles.find((v) => v.id === data.vehicleId);
  if (!vehicle) throw new Error("Vehículo no encontrado");
  const last = Math.max(...d.workOrders.map((w) => Number(w.code.slice(-4))));
  const isMachine = vehicle.type === "Maquinaria";
  const wo: WorkOrderRecord = {
    id: newId("wo"),
    code: `OT-${today().slice(0, 4)}-${String(last + 1).padStart(4, "0")}`,
    clientId: vehicle.clientId,
    vehicleId: vehicle.id,
    technicianId: data.technicianId,
    service: data.symptoms,
    symptoms: data.symptoms,
    status: "recibida",
    priority: data.priority,
    openedAt: today(),
    promisedAt: today(),
    // En maquinaria el campo de lectura es el horómetro
    odometerKm: isMachine ? 0 : data.odometerKm,
    ...(isMachine ? { hourMeter: data.odometerKm } : {}),
    lines: [],
    history: [{ at: new Date().toISOString(), status: "recibida", userId }],
  };
  if (isMachine) vehicle.hourMeter = Math.max(vehicle.hourMeter ?? 0, data.odometerKm);
  else vehicle.odometerKm = Math.max(vehicle.odometerKm, data.odometerKm);
  d.workOrders.unshift(wo);
  return wo;
}

export async function changeWorkOrderStatus(id: string, status: WorkOrderStatus, userId: string, note?: string) {
  const wo = db().workOrders.find((w) => w.id === id);
  if (!wo) throw new Error("OT no encontrada");
  wo.status = status;
  if (status === "entregada") wo.deliveredAt = today();
  wo.history.push({ at: new Date().toISOString(), status, userId, ...(note ? { note } : {}) });
  return wo;
}
