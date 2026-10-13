// Fechas de solo día ('YYYY-MM-DD') interpretadas siempre en America/Bogota.

export const TIME_ZONE = "America/Bogota";

export function todayBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUTC(date: string): number {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  return new Date(toUTC(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Días entre `from` y `to` (positivo si `to` es posterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUTC(to) - toUTC(from)) / 86_400_000);
}

/** 'YYYY-MM' de una fecha. */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Los últimos `n` meses ('YYYY-MM'), del más antiguo al actual. */
export function lastMonths(today: string, n: number): string[] {
  const [y, m] = today.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(y, m - n + i, 1)).toISOString().slice(0, 7));
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

/** "2026-03" → "Mar" */
export function monthLabel(month: string): string {
  return MONTH_LABELS[Number(month.slice(5, 7)) - 1];
}
