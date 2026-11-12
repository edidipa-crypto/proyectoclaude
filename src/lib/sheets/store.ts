import type { Database } from "@/lib/seed";
import type { AppUser } from "@/types";
import { sheetsRequest, type SheetsConfig } from "./client";
import { assemble, fromRow, TABLES, toRow, type Cell, type TableName, type TableRows } from "./schema";

// ---------------------------------------------------------------------------
// Lectura y escritura de la base de datos en Google Sheets.
// Se guarda en memoria unos segundos para no consultar a Google en cada clic;
// toda escritura borra esa copia para que el siguiente clic lea lo nuevo.
// ---------------------------------------------------------------------------

const CACHE_MS = 10_000;
const NAMES = Object.keys(TABLES) as TableName[];

/** Usuarios iniciales según el taller; se editan directamente en la pestaña "Usuarios". */
export const DEFAULT_USERS: AppUser[] = [
  { id: "u-dueno", name: "Miller Wveimar Mesa Estrada", email: "", role: "admin", phone: "", active: true },
  { id: "u-tecnico2", name: "Técnico 2", email: "", role: "tecnico", phone: "", active: true },
  { id: "u-auxiliar", name: "Auxiliar administrativa", email: "", role: "asesor", phone: "", active: true },
  { id: "u-contador", name: "Contador", email: "", role: "contabilidad", phone: "", active: true },
];

const state = globalThis as unknown as {
  __sheets?: { db: Database; headers: Record<TableName, string[]>; loadedAt: number } | null;
  __sheetsReady?: boolean;
};

export function invalidate() {
  state.__sheets = null;
}

const quote = (tab: string) => `'${tab}'`;

/** Crea las pestañas que falten con sus encabezados y los usuarios iniciales. */
async function ensureStructure(config: SheetsConfig) {
  if (state.__sheetsReady) return;
  const meta = await sheetsRequest<{ sheets: { properties: { title: string } }[] }>(config, "?fields=sheets.properties.title");
  const existing = new Set(meta.sheets.map((s) => s.properties.title));
  const missing = NAMES.filter((n) => !existing.has(TABLES[n].tab));
  if (missing.length > 0) {
    await sheetsRequest(config, ":batchUpdate", {
      method: "POST",
      body: { requests: missing.map((n) => ({ addSheet: { properties: { title: TABLES[n].tab, gridProperties: { frozenRowCount: 1 } } } })) },
    });
    await sheetsRequest(config, "/values:batchUpdate", {
      method: "POST",
      body: {
        valueInputOption: "RAW",
        data: missing.map((n) => ({ range: `${quote(TABLES[n].tab)}!A1`, values: [TABLES[n].columns.map((c) => c[0])] })),
      },
    });
    if (missing.includes("users")) await appendRows(config, "users", DEFAULT_USERS as unknown as Record<string, unknown>[], TABLES.users.columns.map((c) => c[0]));
  }
  state.__sheetsReady = true;
}

/** Lee todas las pestañas y arma la base de datos. */
export async function loadDatabase(config: SheetsConfig): Promise<Database> {
  const cached = state.__sheets;
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.db;

  await ensureStructure(config);
  const params = NAMES.map((n) => `ranges=${encodeURIComponent(`${quote(TABLES[n].tab)}!A1:AZ`)}`).join("&");
  const res = await sheetsRequest<{ valueRanges: { values?: unknown[][] }[] }>(config, `/values:batchGet?${params}&valueRenderOption=UNFORMATTED_VALUE`);

  const headers = {} as Record<TableName, string[]>;
  const rows = {} as TableRows;
  NAMES.forEach((name, i) => {
    const [head = [], ...body] = res.valueRanges[i]?.values ?? [];
    headers[name] = head.map((h) => String(h).trim());
    rows[name] = body
      .filter((r) => r.some((c) => c !== "" && c !== null && c !== undefined))
      .map((r) => fromRow(TABLES[name], headers[name], r));
  });

  const db = assemble(rows);
  state.__sheets = { db, headers, loadedAt: Date.now() };
  return db;
}

async function currentHeaders(config: SheetsConfig, name: TableName) {
  return state.__sheets?.headers[name]?.length ? state.__sheets.headers[name] : (await loadDatabase(config), state.__sheets!.headers[name]);
}

/** Agrega registros al final de una pestaña. */
export async function appendRows(config: SheetsConfig, name: TableName, records: Record<string, unknown>[], headers?: string[]) {
  const head = headers ?? (await currentHeaders(config, name));
  const values: Cell[][] = records.map((r) => toRow(TABLES[name], r, head));
  await sheetsRequest(config, `/values/${encodeURIComponent(`${quote(TABLES[name].tab)}!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: { values },
  });
  invalidate();
}

/** Reemplaza la fila cuyo "id" coincide. */
export async function updateRow(config: SheetsConfig, name: TableName, record: Record<string, unknown> & { id: string }) {
  const head = await currentHeaders(config, name);
  const idCol = head.indexOf("id");
  if (idCol < 0) throw new Error(`La pestaña ${TABLES[name].tab} no tiene columna "id"`);
  const column = String.fromCharCode(65 + idCol);
  const ids = await sheetsRequest<{ values?: unknown[][] }>(config, `/values/${encodeURIComponent(`${quote(TABLES[name].tab)}!${column}:${column}`)}`);
  const rowIndex = (ids.values ?? []).findIndex((r) => String(r[0]) === record.id);
  if (rowIndex < 1) throw new Error(`No se encontró ${record.id} en ${TABLES[name].tab}`);
  await sheetsRequest(config, `/values/${encodeURIComponent(`${quote(TABLES[name].tab)}!A${rowIndex + 1}`)}?valueInputOption=RAW`, {
    method: "PUT",
    body: { values: [toRow(TABLES[name], record, head)] },
  });
  invalidate();
}
