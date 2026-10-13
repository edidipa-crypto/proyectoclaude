import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/** Formatea pesos colombianos: $ 12.500.000 */
export function formatCOP(value: number) {
  return copFormatter.format(value);
}

/** Formato corto en millones para ejes y totales: $2.064 M */
export function formatCOPCompact(value: number) {
  if (Math.abs(value) < 1_000_000) return formatCOP(value);
  return `$${(value / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 0 })} M`;
}

export function formatPercent(value: number) {
  return `${value.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

// Las fechas de solo día se fijan al mediodía de Bogotá para que no cambien de día
// cuando el servidor corre en otra zona horaria (p. ej. UTC en Coolify).
function toDate(iso: string) {
  return iso.length <= 10 ? new Date(`${iso}T12:00:00-05:00`) : new Date(iso);
}

export function formatDate(iso: string) {
  return toDate(iso).toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return toDate(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Total facturable de una OT: mano de obra + repuestos + terceros. */
export function workOrderTotal(wo: { laborAmount: number; partsAmount: number; thirdPartyAmount: number }) {
  return wo.laborAmount + wo.partsAmount + wo.thirdPartyAmount;
}
