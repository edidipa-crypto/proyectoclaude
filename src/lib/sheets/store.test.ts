import { generateKeyPairSync } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Prueba del flujo completo contra un Google Sheets simulado en memoria:
// la herramienta crea las pestañas, escribe y vuelve a leer lo escrito.
// ---------------------------------------------------------------------------

type Grid = unknown[][];
const sheets = new Map<string, Grid>();

function tabOf(range: string) {
  return decodeURIComponent(range).split("!")[0].replace(/^'|'$/g, "");
}

function fakeFetch(url: string, init: { method?: string; body?: string } = {}) {
  const json = (data: unknown) => Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
  if (url.startsWith("https://oauth2.googleapis.com/token")) return json({ access_token: "token-prueba", expires_in: 3600 });

  const path = url.replace(/^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/[^/?:]+/, "");
  const body = init.body ? JSON.parse(init.body) : undefined;

  if (path.startsWith("?fields=")) return json({ sheets: [...sheets.keys()].map((title) => ({ properties: { title } })) });
  if (path === ":batchUpdate") {
    for (const r of body.requests) sheets.set(r.addSheet.properties.title, []);
    return json({});
  }
  if (path === "/values:batchUpdate") {
    for (const d of body.data) sheets.set(tabOf(d.range), [...d.values]);
    return json({});
  }
  if (path.startsWith("/values:batchGet")) {
    const ranges = new URLSearchParams(path.split("?")[1]).getAll("ranges");
    return json({ valueRanges: ranges.map((r) => ({ values: sheets.get(tabOf(r)) ?? [] })) });
  }
  const [, range, rest = ""] = path.match(/^\/values\/([^:?]+)(.*)$/) ?? [];
  const tab = tabOf(range);
  const grid = sheets.get(tab)!;
  if (rest.startsWith(":append")) {
    grid.push(...body.values);
    return json({});
  }
  if (init.method === "PUT") {
    const row = Number(decodeURIComponent(range).match(/!A(\d+)/)![1]);
    grid[row - 1] = body.values[0];
    return json({});
  }
  // Lectura de una columna (por ejemplo la de ids)
  const col = decodeURIComponent(range).split("!")[1].split(":")[0].charCodeAt(0) - 65;
  return json({ values: grid.map((r) => [r[col]]) });
}

describe("datos reales en Google Sheets (simulado)", () => {
  beforeAll(() => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    process.env.GOOGLE_SHEETS_ID = "hoja-prueba";
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "dieselpro@proyecto.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = privateKey.export({ type: "pkcs8", format: "pem" }).toString().replace(/\n/g, "\\n");
    vi.stubGlobal("fetch", vi.fn(fakeFetch));
  });

  afterAll(() => {
    delete process.env.GOOGLE_SHEETS_ID;
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    vi.unstubAllGlobals();
  });

  it("crea las pestañas con encabezados y los usuarios del taller en una hoja vacía", async () => {
    const data = await import("@/lib/data");
    expect(data.dataMode()).toBe("sheets");
    const users = await data.getUsers();
    expect(users.map((u) => u.role)).toEqual(["admin", "tecnico", "asesor", "contabilidad"]);
    expect(sheets.get("Clientes")?.[0]).toContain("documento");
    expect(await data.getWorkOrders()).toEqual([]);
  });

  it("guarda cliente, vehículo y OT, y los vuelve a leer desde la hoja", async () => {
    const data = await import("@/lib/data");
    const { invalidate } = await import("./store");

    const client = await data.createClient({
      kind: "empresa", name: "Transportes Prueba S.A.S.", idType: "NIT", idNumber: "800197268", dv: 4, phone: "3101234567",
      billingEmail: "", city: "Itagüí", address: "", paymentTermDays: 30, withholdings: { income: true, vat: false, ica: false },
    });
    const vehicle = await data.createVehicle({ clientId: client.id, plate: "SNK482", brand: "Kenworth", model: "T800", engine: "Cummins ISX15", year: 2019, odometerKm: 684_200, type: "Tractocamión" });
    const wo = await data.createWorkOrder({ vehicleId: vehicle.id, technicianId: "u-dueno", odometerKm: 685_000, priority: "alta", symptoms: "Humo negro y pérdida de potencia" }, "u-auxiliar");
    await data.changeWorkOrderStatus(wo.id, "diagnostico", "u-dueno", "Se revisan inyectores");

    invalidate();
    expect((await data.getClient(client.id))?.withholdings).toEqual({ income: true, vat: false, ica: false });
    expect((await data.getVehicle(vehicle.id))?.odometerKm).toBe(685_000);
    const saved = await data.getWorkOrder(wo.id);
    expect(saved?.code).toMatch(/^OT-\d{4}-0101$/);
    expect(saved?.status).toBe("diagnostico");
    expect(saved?.history.map((h) => h.status)).toEqual(["recibida", "diagnostico"]);
    expect(saved?.history[1].note).toBe("Se revisan inyectores");
    expect(sheets.get("OTs")).toHaveLength(2); // encabezado + 1 OT, actualizada en su misma fila
  });
});
