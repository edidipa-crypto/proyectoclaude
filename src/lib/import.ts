// ---------------------------------------------------------------------------
// Carga de datos desde archivos (Excel o CSV) a la herramienta.
// Todo aquí es lógica pura: el navegador la usa para la vista previa y el
// servidor la vuelve a ejecutar antes de guardar, para no confiar en el navegador.
// ---------------------------------------------------------------------------

import { VAT_RATE, roundCOP } from "@/lib/money";
import { cellText, normalize, parseDate, parseNumber } from "@/lib/parse";
import { nitCheckDigit } from "@/lib/validation";
import type { AppUser, Client, Vehicle, VehicleType, WorkOrderLine, WorkOrderRecord } from "@/types";

export type ImportKind = "clients" | "vehicles" | "workOrders";

export interface FieldSpec {
  key: string;
  label: string;
  required?: boolean;
  /** Nombres de columna habituales (se comparan sin tildes ni mayúsculas) */
  synonyms: string[];
}

const CLIENT_NAME = ["cliente", "nombre", "nombre cliente", "razon social", "empresa", "propietario", "dueno"];
const CLIENT_DOC = ["nit", "cedula", "cc", "documento", "identificacion", "nit cc", "nit o cedula", "no documento", "numero documento"];

export const FIELDS: Record<ImportKind, FieldSpec[]> = {
  clients: [
    { key: "name", label: "Nombre o razón social", required: true, synonyms: CLIENT_NAME },
    { key: "doc", label: "NIT o cédula", synonyms: CLIENT_DOC },
    { key: "dv", label: "Dígito de verificación", synonyms: ["dv", "digito", "digito verificacion"] },
    { key: "phone", label: "Teléfono", synonyms: ["telefono", "celular", "tel", "movil", "whatsapp", "telefonos"] },
    { key: "email", label: "Correo", synonyms: ["correo", "email", "e mail", "correo electronico", "mail"] },
    { key: "city", label: "Ciudad", synonyms: ["ciudad", "municipio"] },
    { key: "address", label: "Dirección", synonyms: ["direccion", "dir"] },
    { key: "contact", label: "Persona de contacto", synonyms: ["contacto", "persona contacto"] },
    { key: "term", label: "Días de crédito", synonyms: ["plazo", "credito", "dias credito", "dias", "plazo dias"] },
  ],
  vehicles: [
    { key: "plate", label: "Placa", required: true, synonyms: ["placa", "placas", "matricula", "codigo"] },
    { key: "clientName", label: "Cliente (nombre)", synonyms: CLIENT_NAME },
    { key: "clientDoc", label: "Cliente (NIT o cédula)", synonyms: CLIENT_DOC },
    { key: "brand", label: "Marca", synonyms: ["marca"] },
    { key: "model", label: "Modelo / línea", synonyms: ["modelo", "linea", "referencia"] },
    { key: "engine", label: "Motor", synonyms: ["motor", "tipo motor"] },
    { key: "year", label: "Año", synonyms: ["ano", "anio", "year", "modelo ano"] },
    { key: "type", label: "Tipo de vehículo", synonyms: ["tipo", "clase", "tipo vehiculo"] },
    { key: "km", label: "Kilometraje", synonyms: ["kilometraje", "km", "kms", "odometro"] },
    { key: "hours", label: "Horómetro", synonyms: ["horometro", "horas"] },
  ],
  workOrders: [
    { key: "date", label: "Fecha", required: true, synonyms: ["fecha", "fecha trabajo", "fecha servicio", "fecha entrega", "fecha ingreso"] },
    { key: "service", label: "Trabajo realizado", required: true, synonyms: ["trabajo", "trabajo realizado", "descripcion", "servicio", "detalle", "reparacion", "observaciones"] },
    { key: "plate", label: "Placa", synonyms: ["placa", "placas", "vehiculo"] },
    { key: "clientName", label: "Cliente (nombre)", synonyms: CLIENT_NAME },
    { key: "clientDoc", label: "Cliente (NIT o cédula)", synonyms: CLIENT_DOC },
    { key: "total", label: "Valor total", synonyms: ["valor", "total", "valor total", "precio", "valor cobrado", "monto"] },
    { key: "labor", label: "Valor mano de obra", synonyms: ["mano de obra", "valor mano de obra", "mo"] },
    { key: "parts", label: "Valor repuestos", synonyms: ["repuestos", "valor repuestos"] },
    { key: "thirdParty", label: "Valor terceros", synonyms: ["terceros", "valor terceros", "trabajos terceros"] },
    { key: "partsCost", label: "Costo de repuestos", synonyms: ["costo repuestos"] },
    { key: "thirdPartyCost", label: "Costo de terceros", synonyms: ["costo terceros"] },
    { key: "technician", label: "Técnico", synonyms: ["tecnico", "mecanico", "responsable"] },
    { key: "km", label: "Kilometraje", synonyms: ["kilometraje", "km", "kms"] },
  ],
};

export const KIND_LABEL: Record<ImportKind, string> = {
  clients: "Clientes",
  vehicles: "Vehículos y máquinas",
  workOrders: "Trabajos realizados",
};

export const MAX_ROWS = 5000;

export type Mapping = Record<string, number>; // campo -> índice de columna (-1 = sin columna)

export interface ImportOptions {
  /** Los valores del archivo ya incluyen IVA */
  pricesIncludeVat: boolean;
}

export interface ImportSnapshot {
  clients: Pick<Client, "id" | "name" | "idNumber">[];
  vehicles: Pick<Vehicle, "id" | "plate" | "clientId">[];
  users: Pick<AppUser, "id" | "name">[];
  workOrderCodes: string[];
}

export interface RowResult {
  line: number;
  status: "nuevo" | "existe" | "error";
  message: string;
}

export interface ImportPlan {
  rows: RowResult[];
  clients: Client[];
  vehicles: Vehicle[];
  workOrders: WorkOrderRecord[];
  warnings: string[];
}

// --- Encabezados ---------------------------------------------------------------------

/** La fila de encabezados: la primera con al menos dos celdas de texto. */
export function findHeaderRow(data: unknown[][]): number {
  const i = data.findIndex((row) => row.filter((c) => typeof c === "string" && c.trim() !== "").length >= 2);
  return Math.max(0, i);
}

/** Relaciona cada campo con la columna cuyo encabezado se le parece. */
export function autoMap(kind: ImportKind, headers: unknown[]): Mapping {
  const names = headers.map((h) => normalize(cellText(h)));
  const used = new Set<number>();
  const mapping: Mapping = {};
  for (const field of FIELDS[kind]) {
    const exact = names.findIndex((n, i) => !used.has(i) && field.synonyms.includes(n));
    const partial = exact >= 0 ? exact : names.findIndex((n, i) => !used.has(i) && n !== "" && field.synonyms.some((s) => s.length > 3 && n.includes(s)));
    mapping[field.key] = partial;
    if (partial >= 0) used.add(partial);
  }
  return mapping;
}

// --- Ayudas ----------------------------------------------------------------------------

/** "900.123.456-7" → { number: "900123456", dv: 7 } */
export function splitDocument(raw: string): { number: string; dv?: number } {
  const m = raw.replace(/[.\s]/g, "").match(/^(\d{5,12})(?:-(\d))?$/);
  if (!m) return { number: raw.replace(/\D/g, "") };
  return { number: m[1], ...(m[2] ? { dv: Number(m[2]) } : {}) };
}

const COMPANY_WORDS = /\b(s ?a ?s|ltda|s ?a|e ?u|cia|limitada|sociedad|transportes?|inversiones|constructora|logistica|cooperativa|corporacion|empresa)\b/;

function guessCompany(name: string, doc: string): boolean {
  return (doc.length >= 9 && /^[89]/.test(doc)) || COMPANY_WORDS.test(normalize(name));
}

function guessVehicleType(text: string): VehicleType {
  const t = normalize(text);
  if (/excavadora|retro|cargador|maquin|motoniveladora|bulldozer|vibro|compactador|grua|montacarga/.test(t)) return "Maquinaria";
  if (/volqueta/.test(t)) return "Volqueta";
  if (/tracto|cabezote|tractomula/.test(t)) return "Tractocamión";
  if (/bus|buseta/.test(t)) return "Bus";
  return "Camión";
}

const plateKey = (p: string) => p.toUpperCase().replace(/[^A-Z0-9]/g, "");

interface Context {
  snapshot: ImportSnapshot;
  newId: (prefix: string) => string;
  options: ImportOptions;
  byDoc: Map<string, string>;
  byName: Map<string, string>;
  byPlate: Map<string, { id: string; clientId: string }>;
  plan: ImportPlan;
}

function context(snapshot: ImportSnapshot, newId: (p: string) => string, options: ImportOptions): Context {
  return {
    snapshot,
    newId,
    options,
    byDoc: new Map(snapshot.clients.filter((c) => c.idNumber).map((c) => [c.idNumber, c.id])),
    byName: new Map(snapshot.clients.map((c) => [normalize(c.name), c.id])),
    byPlate: new Map(snapshot.vehicles.map((v) => [plateKey(v.plate), { id: v.id, clientId: v.clientId }])),
    plan: { rows: [], clients: [], vehicles: [], workOrders: [], warnings: [] },
  };
}

function newClient(ctx: Context, name: string, rawDoc: string, extra: Partial<Client> = {}): Client {
  const { number, dv } = splitDocument(rawDoc);
  const company = guessCompany(name, number);
  const client: Client = {
    id: ctx.newId("cl"),
    kind: company ? "empresa" : "persona",
    name,
    idType: company ? "NIT" : "CC",
    idNumber: number,
    ...(company && number ? { dv: dv ?? nitCheckDigit(number) } : {}),
    phone: "",
    billingEmail: "",
    city: "Itagüí",
    address: "",
    paymentTermDays: 0,
    withholdings: { income: false, vat: false, ica: false },
    ...extra,
  };
  ctx.plan.clients.push(client);
  if (number) ctx.byDoc.set(number, client.id);
  ctx.byName.set(normalize(name), client.id);
  return client;
}

/** Busca el cliente por documento o nombre; si no existe y hay nombre, lo crea. */
function resolveClient(ctx: Context, name: string, rawDoc: string): { id: string; created: boolean } | null {
  const doc = splitDocument(rawDoc).number;
  const found = (doc && ctx.byDoc.get(doc)) || (name && ctx.byName.get(normalize(name)));
  if (found) return { id: found, created: false };
  if (!name) return null;
  return { id: newClient(ctx, name, rawDoc).id, created: true };
}

// --- Planes por tipo ---------------------------------------------------------------------

/**
 * Revisa cada fila y arma los registros a crear, sin guardar nada.
 * `rows` son las filas de datos (sin la fila de encabezados); `firstLine` es el
 * número de fila del archivo donde empiezan, para mostrar errores entendibles.
 */
export function planImport(
  kind: ImportKind,
  rows: unknown[][],
  mapping: Mapping,
  snapshot: ImportSnapshot,
  options: ImportOptions,
  newId: (prefix: string) => string,
  firstLine = 2,
): ImportPlan {
  const ctx = context(snapshot, newId, options);
  const get = (row: unknown[], key: string) => (mapping[key] >= 0 ? row[mapping[key]] : undefined);
  const text = (row: unknown[], key: string) => cellText(get(row, key));

  const missing = FIELDS[kind].filter((f) => f.required && !(mapping[f.key] >= 0));
  if (missing.length) {
    ctx.plan.warnings.push(`Falta indicar la columna de: ${missing.map((f) => f.label).join(", ")}.`);
    return ctx.plan;
  }

  // Consecutivo de OT por año (OT-2025-0101, OT-2025-0102…), continuando los existentes
  const lastByYear = new Map<string, number>();
  for (const code of snapshot.workOrderCodes) {
    const m = code.match(/^OT-(\d{4})-(\d+)$/);
    if (m) lastByYear.set(m[1], Math.max(lastByYear.get(m[1]) ?? 100, Number(m[2])));
  }
  const nextCode = (year: string) => {
    const n = (lastByYear.get(year) ?? 100) + 1;
    lastByYear.set(year, n);
    return `OT-${year}-${String(n).padStart(4, "0")}`;
  };

  rows.slice(0, MAX_ROWS).forEach((row, i) => {
    const line = firstLine + i;
    if (!row.some((c) => cellText(c) !== "")) return; // fila vacía
    const result = (status: RowResult["status"], message: string) => ctx.plan.rows.push({ line, status, message });

    if (kind === "clients") {
      const name = text(row, "name");
      if (!name) return result("error", "Sin nombre");
      const rawDoc = text(row, "doc") + (text(row, "dv") ? `-${text(row, "dv")}` : "");
      const doc = splitDocument(rawDoc).number;
      if ((doc && ctx.byDoc.has(doc)) || ctx.byName.has(normalize(name))) return result("existe", `${name} ya está registrado`);
      const c = newClient(ctx, name, rawDoc, {
        phone: text(row, "phone").replace(/\D/g, ""),
        billingEmail: text(row, "email"),
        ...(text(row, "city") ? { city: text(row, "city") } : {}),
        address: text(row, "address"),
        ...(text(row, "contact") ? { contactName: text(row, "contact") } : {}),
        paymentTermDays: Math.max(0, Math.round(parseNumber(get(row, "term") ?? 0))),
      });
      return result("nuevo", `${c.name}${doc ? ` · ${c.idType} ${doc}` : " · sin documento"}`);
    }

    if (kind === "vehicles") {
      const plate = plateKey(text(row, "plate"));
      if (!plate) return result("error", "Sin placa");
      if (ctx.byPlate.has(plate)) return result("existe", `La placa ${plate} ya está registrada`);
      const client = resolveClient(ctx, text(row, "clientName"), text(row, "clientDoc"));
      if (!client) return result("error", `Placa ${plate}: falta el cliente`);
      const type = text(row, "type") ? guessVehicleType(text(row, "type")) : guessVehicleType(`${text(row, "brand")} ${text(row, "model")}`);
      const isMachine = type === "Maquinaria";
      const reading = Math.round(parseNumber(get(row, isMachine ? "hours" : "km") ?? get(row, "km") ?? 0));
      const v: Vehicle = {
        id: ctx.newId("vh"),
        clientId: client.id,
        plate,
        brand: text(row, "brand") || "Sin dato",
        model: text(row, "model") || "Sin dato",
        engine: text(row, "engine") || "Sin dato",
        year: Math.round(parseNumber(get(row, "year") ?? 0)),
        type,
        odometerKm: isMachine ? 0 : reading,
        ...(isMachine ? { hourMeter: reading } : {}),
      };
      ctx.plan.vehicles.push(v);
      ctx.byPlate.set(plate, { id: v.id, clientId: client.id });
      return result("nuevo", `${plate} · ${v.brand} ${v.model}${client.created ? " · se crea el cliente" : ""}`);
    }

    // Trabajos realizados
    const date = parseDate(get(row, "date"));
    if (!date) return result("error", `Fecha no reconocida: "${text(row, "date")}"`);
    const service = text(row, "service");
    if (!service) return result("error", "Sin descripción del trabajo");

    const plate = plateKey(text(row, "plate"));
    let vehicle = plate ? ctx.byPlate.get(plate) : undefined;
    let clientId = vehicle?.clientId;
    let note = "";
    if (!clientId) {
      const client = resolveClient(ctx, text(row, "clientName"), text(row, "clientDoc"));
      if (!client) return result("error", "Falta el cliente o una placa registrada");
      clientId = client.id;
      if (client.created) note += " · se crea el cliente";
    }
    if (!vehicle) {
      // Sin placa registrada: se crea el vehículo (o uno "SIN PLACA" por cliente)
      const key = plate || `SINPLACA-${clientId}`;
      vehicle = ctx.byPlate.get(key);
      if (!vehicle) {
        const v: Vehicle = { id: ctx.newId("vh"), clientId, plate: plate || "SIN PLACA", brand: "Sin dato", model: "Sin dato", engine: "Sin dato", year: 0, type: "Camión", odometerKm: 0 };
        ctx.plan.vehicles.push(v);
        vehicle = { id: v.id, clientId };
        ctx.byPlate.set(key, vehicle);
        note += plate ? ` · se crea el vehículo ${plate}` : " · sin placa";
      }
    }

    const toNet = (n: number) => (ctx.options.pricesIncludeVat ? roundCOP(n / (1 + VAT_RATE / 100)) : roundCOP(n));
    const amounts = { labor: toNet(parseNumber(get(row, "labor") ?? 0)), part: toNet(parseNumber(get(row, "parts") ?? 0)), third_party: toNet(parseNumber(get(row, "thirdParty") ?? 0)) };
    const total = toNet(parseNumber(get(row, "total") ?? 0));
    if (amounts.labor + amounts.part + amounts.third_party === 0) {
      if (total <= 0) return result("error", "Sin valor cobrado");
      amounts.labor = total;
    }
    const costs = { part: roundCOP(parseNumber(get(row, "partsCost") ?? 0)), third_party: roundCOP(parseNumber(get(row, "thirdPartyCost") ?? 0)) };
    const descriptions = { labor: service, part: "Repuestos", third_party: "Trabajos de terceros" };
    const lines: WorkOrderLine[] = (["labor", "part", "third_party"] as const)
      .filter((k) => amounts[k] > 0)
      .map((k) => ({
        id: ctx.newId("ln"),
        kind: k,
        description: descriptions[k],
        quantity: 1,
        unitPrice: amounts[k],
        unitCost: k === "labor" ? 0 : costs[k],
        taxRate: VAT_RATE,
        discountPct: 0,
      }));

    const technician = text(row, "technician");
    const technicianId = technician ? ctx.snapshot.users.find((u) => normalize(u.name).includes(normalize(technician)))?.id ?? null : null;
    const id = ctx.newId("wo");
    ctx.plan.workOrders.push({
      id,
      code: nextCode(date.slice(0, 4)),
      clientId,
      vehicleId: vehicle.id,
      technicianId,
      service,
      symptoms: service,
      status: "entregada",
      priority: "media",
      openedAt: date,
      promisedAt: date,
      deliveredAt: date,
      odometerKm: Math.round(parseNumber(get(row, "km") ?? 0)),
      lines,
      history: [{ at: `${date}T12:00:00-05:00`, status: "entregada", userId: "importacion", note: "Cargado desde archivo" }],
    });
    const sum = lines.reduce((s, l) => s + l.unitPrice, 0);
    return result("nuevo", `${date} · ${service.slice(0, 60)} · $${sum.toLocaleString("es-CO")} sin IVA${note}`);
  });

  if (kind === "workOrders" && ctx.plan.workOrders.length > 0 && !(mapping.partsCost >= 0) && !(mapping.thirdPartyCost >= 0)) {
    ctx.plan.warnings.push("El archivo no trae costos: en el dashboard la utilidad de estos trabajos saldrá más alta que la real.");
  }
  if (rows.length > MAX_ROWS) ctx.plan.warnings.push(`Solo se toman las primeras ${MAX_ROWS} filas.`);
  return ctx.plan;
}
