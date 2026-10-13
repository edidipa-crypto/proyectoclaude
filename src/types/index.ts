// ---------------------------------------------------------------------------
// Tipos de dominio: centro de servicio especializado en motores diésel
// ---------------------------------------------------------------------------

// --- Usuarios y roles --------------------------------------------------------

export type Role = "admin" | "asesor" | "tecnico" | "contabilidad";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  active: boolean;
}

// --- Clientes y vehículos ----------------------------------------------------

export interface WithholdingConfig {
  /** Retención en la fuente */
  income: boolean;
  /** ReteIVA */
  vat: boolean;
  /** ReteICA */
  ica: boolean;
}

export interface Client {
  id: string;
  kind: "empresa" | "persona";
  name: string;
  idType: "NIT" | "CC";
  idNumber: string;
  dv?: number;
  contactName?: string;
  phone: string;
  billingEmail: string;
  city: string;
  address: string;
  /** 0 = contado */
  paymentTermDays: number;
  withholdings: WithholdingConfig;
}

export type VehicleType = "Tractocamión" | "Volqueta" | "Bus" | "Camión" | "Maquinaria";

export interface Vehicle {
  id: string;
  clientId: string;
  plate: string;
  brand: string;
  model: string;
  engine: string; // ej. "Cummins ISX15", "Detroit DD15"
  year: number;
  odometerKm: number;
  /** Maquinaria: horas de motor */
  hourMeter?: number;
  type: VehicleType;
}

// --- Órdenes de trabajo ------------------------------------------------------

export type WorkOrderStatus =
  | "recibida"
  | "diagnostico"
  | "cotizada"
  | "aprobada"
  | "en_reparacion"
  | "esperando_repuestos"
  | "en_tercero"
  | "lista"
  | "entregada"
  | "facturada";

export type WorkOrderPriority = "baja" | "media" | "alta" | "critica";

export type LineKind = "labor" | "part" | "third_party";

export interface WorkOrderLine {
  id: string;
  kind: LineKind;
  description: string;
  quantity: number;
  /** Precio de venta unitario antes de IVA */
  unitPrice: number;
  unitCost: number;
  taxRate: number;
  discountPct: number;
  itemId?: string;
  thirdPartyJobId?: string;
}

export interface WorkOrderEvent {
  at: string; // ISO con zona horaria
  status: WorkOrderStatus;
  userId: string;
  note?: string;
}

/** OT completa, tal como se guarda. */
export interface WorkOrderRecord {
  id: string;
  code: string; // OT-2026-0142
  clientId: string;
  vehicleId: string;
  technicianId: string | null;
  service: string;
  symptoms: string;
  diagnosis?: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  openedAt: string; // YYYY-MM-DD
  promisedAt: string;
  deliveredAt?: string;
  odometerKm: number;
  hourMeter?: number;
  lines: WorkOrderLine[];
  history: WorkOrderEvent[];
}

/** Fila de la tabla de OTs (se arma desde WorkOrderRecord en lib/data.ts). */
export interface WorkOrder {
  id: string;
  code: string;
  clientId: string;
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

// --- Terceros y proveedores --------------------------------------------------

export type ThirdPartyProviderType =
  | "laboratorio_inyeccion"
  | "rectificadora"
  | "reparacion_turbos"
  | "radiadores"
  | "electronica"
  | "repuestos";

export interface ThirdPartyProvider {
  id: string;
  name: string;
  nit: string;
  type: ThirdPartyProviderType;
  city: string;
  contact: string;
  phone: string;
  /** 0 = contado */
  paymentTermDays: number;
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

/** Factura de un proveedor o tercero pendiente de pago. */
export interface Payable {
  id: string;
  providerId: string;
  invoiceRef: string;
  date: string;
  dueDate: string;
  concept: string;
  /** Total con IVA */
  amount: number;
  payments: Payment[];
}

// --- Finanzas ------------------------------------------------------------------

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

export type PaymentMethod = "Efectivo" | "Transferencia" | "Nequi" | "Tarjeta";

export interface Payment {
  date: string;
  amount: number;
  method: PaymentMethod;
}

export type ExpenseCategory =
  | "Nómina técnicos"
  | "Nómina administrativa"
  | "Arriendo"
  | "Servicios públicos"
  | "Honorarios"
  | "Seguridad social"
  | "Herramientas e insumos"
  | "Publicidad";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
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
  category: "inyeccion" | "bombas" | "turbos" | "filtros" | "sensores" | "empaques" | "lubricantes";
  oemRef: string;
  brand: string;
  unit: string;
  location: string;
  stock: number;
  minStock: number;
  /** Costo promedio ponderado (calculado desde el kárdex) */
  unitCost: number;
  /** Precio de venta antes de IVA */
  salePrice: number;
}

export interface Invoice {
  id: string;
  number: string | null;
  workOrderId: string;
  clientId: string;
  subtotal: number;
  tax: number;
  total: number;
  /** Total menos retenciones: lo que consigna el cliente */
  netPayable: number;
  dianStatus: DianDocumentStatus;
  cufe: string | null;
  issuedAt: string | null;
  dueDate: string | null;
  payments: Payment[];
  message?: string;
}
