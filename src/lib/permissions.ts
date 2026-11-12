import type { Role, WorkOrderStatus } from "@/types";

// ---------------------------------------------------------------------------
// Qué puede ver y hacer cada rol. En la Fase 1 estas mismas reglas se aplican
// también en la base de datos (RLS por rol).
// ---------------------------------------------------------------------------

export type Section =
  | "dashboard"
  | "technician"
  | "work-orders"
  | "clients"
  | "inventory"
  | "third-party"
  | "billing"
  | "receivables"
  | "payables"
  | "expenses"
  | "users"
  | "import"
  /** Ver costos y márgenes (no es una página) */
  | "costs";

const ACCESS: Record<Role, Section[]> = {
  admin: ["dashboard", "technician", "work-orders", "clients", "inventory", "third-party", "billing", "receivables", "payables", "expenses", "users", "import", "costs"],
  asesor: ["work-orders", "clients", "inventory", "third-party"],
  tecnico: ["technician", "inventory"],
  contabilidad: ["dashboard", "clients", "inventory", "third-party", "billing", "receivables", "payables", "expenses", "costs"],
};

export function can(role: Role, section: Section): boolean {
  return ACCESS[role].includes(section);
}

export const HOME_BY_ROLE: Record<Role, string> = {
  admin: "/dashboard",
  contabilidad: "/dashboard",
  asesor: "/work-orders",
  tecnico: "/technician",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  asesor: "Asesor de servicio",
  tecnico: "Técnico",
  contabilidad: "Contabilidad",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  admin: "Ve todo: taller, inventario, finanzas y usuarios.",
  asesor: "Recibe vehículos, abre OTs, cotiza y entrega.",
  tecnico: "Ve solo sus OTs y reporta avance desde el celular.",
  contabilidad: "Facturación, cartera, pagos, gastos y finanzas.",
};

/** Siguientes pasos permitidos para cada estado de la OT. */
export const NEXT_STATUSES: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  recibida: ["diagnostico"],
  diagnostico: ["cotizada"],
  cotizada: ["aprobada"],
  aprobada: ["en_reparacion"],
  en_reparacion: ["esperando_repuestos", "en_tercero", "lista"],
  esperando_repuestos: ["en_reparacion"],
  en_tercero: ["en_reparacion"],
  lista: ["entregada"],
  entregada: [],
  facturada: [],
};

/** El técnico no cotiza, no registra la aprobación del cliente ni entrega el vehículo. */
export function technicianCanMoveTo(to: WorkOrderStatus): boolean {
  return !["cotizada", "aprobada", "entregada", "facturada"].includes(to);
}
