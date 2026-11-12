// Lectura tolerante de valores escritos por personas en Excel o Google Sheets.

/** Números como se escriben en Colombia: "$ 1.500.000", "2,5", "6.500.000". */
export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/[$\s]/g, "");
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(text) ? text.replace(/\./g, "") : text;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Fechas a 'YYYY-MM-DD': objetos Date, '15/03/2025', '2025-03-15', '15-03-25' o número de serie de Excel. */
export function parseDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number" && value > 20_000 && value < 80_000) {
    // Número de serie de Excel (días desde 1899-12-30)
    return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000).toISOString().slice(0, 10);
  }
  const text = String(value ?? "").trim();
  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]));
  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return valid(year, Number(m[2]), Number(m[1])); // día/mes/año, como se escribe en Colombia
  }
  return null;
}

function valid(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date.toISOString().slice(0, 10);
}

/** Texto limpio de una celda. */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

/** Para comparar nombres y encabezados: minúsculas, sin tildes ni signos. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
