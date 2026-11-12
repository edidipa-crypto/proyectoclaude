import { createSign } from "node:crypto";

// ---------------------------------------------------------------------------
// Cliente mínimo de la API de Google Sheets con una cuenta de servicio.
// Las credenciales vienen solo de variables de entorno (nunca del código).
// ---------------------------------------------------------------------------

export interface SheetsConfig {
  sheetId: string;
  email: string;
  privateKey: string;
}

export function sheetsConfig(): SheetsConfig | null {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!sheetId || !email || !key) return null;
  // En Vercel la llave suele pegarse con "\n" literales en vez de saltos de línea.
  return { sheetId, email, privateKey: key.replace(/\\n/g, "\n") };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(config: SheetsConfig): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const encode = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
    iss: config.email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(config.privateKey).toString("base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google rechazó la cuenta de servicio (${res.status}). Revisa GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY.`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

/** Llama a la API de Sheets sobre la hoja configurada. `path` empieza con "/" o "?" (o vacío). */
export async function sheetsRequest<T>(config: SheetsConfig, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await accessToken(config);
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}${path}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 403 || res.status === 404) {
      throw new Error(`Sin acceso a la hoja de Google (${res.status}). ¿La compartiste como Editor con ${config.email}? ${detail}`);
    }
    throw new Error(`Google Sheets respondió ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}
