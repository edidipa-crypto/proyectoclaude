import type {
  DianDocumentStatus,
  InventoryItem,
  ThirdPartyJobStatus,
  ThirdPartyProviderType,
  WorkOrderPriority,
  WorkOrderStatus,
} from "@/types";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, { label: string; variant: BadgeVariant }> = {
  recibida: { label: "Recibida", variant: "outline" },
  diagnostico: { label: "Diagnóstico", variant: "info" },
  en_reparacion: { label: "En reparación", variant: "default" },
  esperando_repuestos: { label: "Esperando repuestos", variant: "warning" },
  en_tercero: { label: "En tercero", variant: "warning" },
  lista: { label: "Lista para entrega", variant: "success" },
  entregada: { label: "Entregada", variant: "secondary" },
  facturada: { label: "Facturada", variant: "success" },
};

export const WORK_ORDER_PRIORITY: Record<WorkOrderPriority, { label: string; variant: BadgeVariant }> = {
  baja: { label: "Baja", variant: "outline" },
  media: { label: "Media", variant: "secondary" },
  alta: { label: "Alta", variant: "warning" },
  critica: { label: "Crítica", variant: "destructive" },
};

export const PROVIDER_TYPE: Record<ThirdPartyProviderType, string> = {
  laboratorio_inyeccion: "Laboratorio de inyección",
  rectificadora: "Rectificadora",
  reparacion_turbos: "Reparación de turbos",
  radiadores: "Radiadores",
  electronica: "Electrónica / ECM",
};

export const THIRD_PARTY_STATUS: Record<ThirdPartyJobStatus, { label: string; variant: BadgeVariant }> = {
  cotizado: { label: "Cotizado", variant: "outline" },
  enviado: { label: "Enviado", variant: "info" },
  en_proceso: { label: "En proceso", variant: "warning" },
  recibido: { label: "Recibido", variant: "success" },
  pagado: { label: "Pagado", variant: "secondary" },
};

export const DIAN_STATUS: Record<DianDocumentStatus, { label: string; variant: BadgeVariant }> = {
  pendiente: { label: "Pendiente", variant: "outline" },
  enviado: { label: "Enviado a DIAN", variant: "info" },
  aceptado: { label: "Aceptado", variant: "success" },
  aceptado_con_notificaciones: { label: "Aceptado c/ notificaciones", variant: "warning" },
  rechazado: { label: "Rechazado", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
};

export const INVENTORY_CATEGORY: Record<InventoryItem["category"], string> = {
  inyeccion: "Inyección",
  bombas: "Bombas alta presión",
  turbos: "Turbos",
  filtros: "Filtros",
  sensores: "Sensores / válvulas",
  empaques: "Empaques",
};
