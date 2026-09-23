// ---------------------------------------------------------------------------
// Tipos de dominio: centro de servicio especializado en motores diésel
// ---------------------------------------------------------------------------

export type WorkOrderStatus =
  | "recibida"
  | "diagnostico"
  | "en_reparacion"
  | "esperando_repuestos"
  | "en_tercero"
  | "lista"
  | "entregada"
  | "facturada";

export type WorkOrderPriority = "baja" | "media" | "alta" | "critica";

export interface Vehicle {
  plate: string;
  brand: string;
  model: string;
  engine: string; // ej. "Cummins ISX15", "Detroit DD15"
  year: number;
  odometerKm: number;
}

export interface WorkOrder {
  id: string;
  code: string; // OT-2026-0142
  client: string;
  clientNit: string;
  vehicle: Vehicle;
  service: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  technician: string;
  openedAt: string; // ISO date (YYYY-MM-DD)
  promisedAt: string;
  laborAmount: number; // mano de obra (COP)
  partsAmount: number; // repuestos diésel (COP)
  thirdPartyAmount: number; // costo de terceros cobrado (COP)
}

export type ThirdPartyProviderType =
  | "laboratorio_inyeccion"
  | "rectificadora"
  | "reparacion_turbos"
  | "radiadores"
  | "electronica";

export interface ThirdPartyProvider {
  id: string;
  name: string;
  nit: string;
  type: ThirdPartyProviderType;
  city: string;
}

export type ThirdPartyJobStatus = "cotizado" | "enviado" | "en_proceso" | "recibido" | "pagado";

export interface ThirdPartyJob {
  id: string;
  workOrderId: string | null; // enlace a la OT
  providerId: string;
  description: string;
  cost: number; // lo que nos cobra el tercero
  markupPct: number; // margen aplicado al cliente
  status: ThirdPartyJobStatus;
  sentAt: string;
  expectedAt: string;
  invoiceRef?: string;
}

export interface MonthlyFinancials {
  month: string; // "2026-01"
  label: string; // "Ene"
  revenue: number;
  dieselPartsCost: number;
  thirdPartyCost: number;
  laborCost: number;
  overheadCost: number;
}

export interface CostSlice {
  key: string;
  name: string;
  kind: "directo" | "operativo";
  value: number;
}

// ---------------------------------------------------------------------------
// Facturación electrónica DIAN (orquestada por n8n)
// ---------------------------------------------------------------------------

export type DianDocumentStatus =
  | "pendiente"
  | "enviado"
  | "aceptado"
  | "aceptado_con_notificaciones"
  | "rechazado"
  | "error";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: "inyeccion" | "bombas" | "turbos" | "filtros" | "sensores" | "empaques";
  oemRef: string;
  stock: number;
  minStock: number;
  unitCost: number;
}

export interface Invoice {
  id: string;
  number: string | null;
  workOrderId: string;
  total: number;
  dianStatus: DianDocumentStatus;
  cufe: string | null;
  issuedAt: string | null;
  message?: string;
}
