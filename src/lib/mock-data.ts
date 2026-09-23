import type {
  CostSlice,
  InventoryItem,
  Invoice,
  MonthlyFinancials,
  ThirdPartyJob,
  ThirdPartyProvider,
  WorkOrder,
} from "@/types";

// ---------------------------------------------------------------------------
// Datos simulados realistas para el MVP. Montos en pesos colombianos (COP).
// Se reemplazan por consultas a Supabase en lib/data.ts cuando haya backend.
// ---------------------------------------------------------------------------

export const monthlyFinancials: MonthlyFinancials[] = [
  { month: "2025-10", label: "Oct", revenue: 186_400_000, dieselPartsCost: 71_200_000, thirdPartyCost: 24_800_000, laborCost: 32_500_000, overheadCost: 18_900_000 },
  { month: "2025-11", label: "Nov", revenue: 198_750_000, dieselPartsCost: 76_900_000, thirdPartyCost: 27_300_000, laborCost: 32_500_000, overheadCost: 19_400_000 },
  { month: "2025-12", label: "Dic", revenue: 172_300_000, dieselPartsCost: 64_100_000, thirdPartyCost: 21_600_000, laborCost: 38_200_000, overheadCost: 20_100_000 },
  { month: "2026-01", label: "Ene", revenue: 164_900_000, dieselPartsCost: 60_800_000, thirdPartyCost: 22_900_000, laborCost: 33_800_000, overheadCost: 19_200_000 },
  { month: "2026-02", label: "Feb", revenue: 205_600_000, dieselPartsCost: 80_300_000, thirdPartyCost: 29_700_000, laborCost: 33_800_000, overheadCost: 19_600_000 },
  { month: "2026-03", label: "Mar", revenue: 231_200_000, dieselPartsCost: 91_700_000, thirdPartyCost: 33_400_000, laborCost: 34_600_000, overheadCost: 20_300_000 },
  { month: "2026-04", label: "Abr", revenue: 219_800_000, dieselPartsCost: 86_100_000, thirdPartyCost: 31_900_000, laborCost: 34_600_000, overheadCost: 20_000_000 },
  { month: "2026-05", label: "May", revenue: 242_500_000, dieselPartsCost: 95_400_000, thirdPartyCost: 36_200_000, laborCost: 35_900_000, overheadCost: 20_800_000 },
  { month: "2026-06", label: "Jun", revenue: 228_100_000, dieselPartsCost: 88_600_000, thirdPartyCost: 34_100_000, laborCost: 38_400_000, overheadCost: 21_200_000 },
  { month: "2026-07", label: "Jul", revenue: 254_300_000, dieselPartsCost: 99_800_000, thirdPartyCost: 38_900_000, laborCost: 36_200_000, overheadCost: 21_500_000 },
  { month: "2026-08", label: "Ago", revenue: 267_900_000, dieselPartsCost: 104_200_000, thirdPartyCost: 41_300_000, laborCost: 36_200_000, overheadCost: 21_900_000 },
  { month: "2026-09", label: "Sep", revenue: 249_600_000, dieselPartsCost: 96_500_000, thirdPartyCost: 37_800_000, laborCost: 36_800_000, overheadCost: 22_100_000 },
];

export const providers: ThirdPartyProvider[] = [
  { id: "prv-01", name: "Laboratorio Diésel Inyectronic S.A.S.", nit: "900.482.117-3", type: "laboratorio_inyeccion", city: "Bogotá" },
  { id: "prv-02", name: "Rectificadora Motores del Norte", nit: "830.115.902-1", type: "rectificadora", city: "Funza" },
  { id: "prv-03", name: "TurboService Colombia", nit: "901.334.560-8", type: "reparacion_turbos", city: "Bogotá" },
  { id: "prv-04", name: "Common Rail Center Ltda.", nit: "900.771.245-6", type: "laboratorio_inyeccion", city: "Mosquera" },
  { id: "prv-05", name: "Radiadores Industriales JM", nit: "79.456.221-4", type: "radiadores", city: "Soacha" },
  { id: "prv-06", name: "ECM Diagnostics Pro", nit: "901.228.109-0", type: "electronica", city: "Bogotá" },
];

export const workOrders: WorkOrder[] = [
  {
    id: "wo-0142", code: "OT-2026-0142", client: "Transportes Andinos de Carga S.A.S.", clientNit: "900.123.456-7",
    vehicle: { plate: "SNK-482", brand: "Kenworth", model: "T800", engine: "Cummins ISX15", year: 2019, odometerKm: 684_200 },
    service: "Overhaul de inyectores common rail (6) + calibración en banco",
    status: "en_tercero", priority: "alta", technician: "Jhon Ramírez", openedAt: "2026-09-15", promisedAt: "2026-09-26",
    laborAmount: 3_850_000, partsAmount: 9_600_000, thirdPartyAmount: 7_440_000,
  },
  {
    id: "wo-0141", code: "OT-2026-0141", client: "Logística Sabana Express", clientNit: "901.552.310-2",
    vehicle: { plate: "TTR-915", brand: "Freightliner", model: "Cascadia", engine: "Detroit DD15", year: 2020, odometerKm: 512_900 },
    service: "Reemplazo bomba de alta presión + purga sistema de combustible",
    status: "esperando_repuestos", priority: "critica", technician: "Carlos Mendoza", openedAt: "2026-09-14", promisedAt: "2026-09-24",
    laborAmount: 2_400_000, partsAmount: 14_200_000, thirdPartyAmount: 0,
  },
  {
    id: "wo-0140", code: "OT-2026-0140", client: "Agregados La Calera", clientNit: "860.045.721-9",
    vehicle: { plate: "WFP-207", brand: "International", model: "HX620", engine: "Cummins X15", year: 2021, odometerKm: 298_400 },
    service: "Reparación turbo VGT: cambio de cartucho CHRA y actuador",
    status: "en_reparacion", priority: "alta", technician: "Andrés Pulido", openedAt: "2026-09-13", promisedAt: "2026-09-23",
    laborAmount: 1_650_000, partsAmount: 2_100_000, thirdPartyAmount: 5_980_000,
  },
  {
    id: "wo-0139", code: "OT-2026-0139", client: "Coordinadora Mercantil", clientNit: "890.904.713-1",
    vehicle: { plate: "SXL-630", brand: "Volvo", model: "FH 500", engine: "Volvo D13K", year: 2018, odometerKm: 891_300 },
    service: "Reparación general de motor: rectificado de cigüeñal y camisas",
    status: "en_tercero", priority: "media", technician: "Jhon Ramírez", openedAt: "2026-09-08", promisedAt: "2026-10-06",
    laborAmount: 12_800_000, partsAmount: 21_450_000, thirdPartyAmount: 9_200_000,
  },
  {
    id: "wo-0138", code: "OT-2026-0138", client: "Transportes Andinos de Carga S.A.S.", clientNit: "900.123.456-7",
    vehicle: { plate: "SNK-511", brand: "Kenworth", model: "T880", engine: "PACCAR MX-13", year: 2022, odometerKm: 241_700 },
    service: "Diagnóstico falla EGR + limpieza DPF y regeneración forzada",
    status: "lista", priority: "media", technician: "Luis Castaño", openedAt: "2026-09-10", promisedAt: "2026-09-19",
    laborAmount: 1_950_000, partsAmount: 3_480_000, thirdPartyAmount: 0,
  },
  {
    id: "wo-0137", code: "OT-2026-0137", client: "Buses Intermunicipales del Oriente", clientNit: "800.219.334-5",
    vehicle: { plate: "VKD-118", brand: "Mercedes-Benz", model: "O500 RSD", engine: "OM 457 LA", year: 2017, odometerKm: 1_040_500 },
    service: "Cambio de inyectores bomba-unidad (PLD) + sincronización",
    status: "facturada", priority: "media", technician: "Carlos Mendoza", openedAt: "2026-09-02", promisedAt: "2026-09-09",
    laborAmount: 2_700_000, partsAmount: 11_300_000, thirdPartyAmount: 2_860_000,
  },
  {
    id: "wo-0136", code: "OT-2026-0136", client: "Constructora Vial Cundinamarca", clientNit: "900.887.412-3",
    vehicle: { plate: "OQT-744", brand: "Caterpillar", model: "Volqueta 725", engine: "CAT C13 ACERT", year: 2016, odometerKm: 14_820 },
    service: "Reparación bomba de transferencia + filtros separadores de agua",
    status: "entregada", priority: "baja", technician: "Andrés Pulido", openedAt: "2026-08-29", promisedAt: "2026-09-03",
    laborAmount: 980_000, partsAmount: 1_760_000, thirdPartyAmount: 0,
  },
  {
    id: "wo-0135", code: "OT-2026-0135", client: "Logística Sabana Express", clientNit: "901.552.310-2",
    vehicle: { plate: "TTR-877", brand: "Freightliner", model: "M2 106", engine: "Cummins ISB 6.7", year: 2019, odometerKm: 402_150 },
    service: "Pruebas de retorno de inyectores + reemplazo válvula IMV",
    status: "facturada", priority: "media", technician: "Luis Castaño", openedAt: "2026-08-26", promisedAt: "2026-08-30",
    laborAmount: 1_200_000, partsAmount: 2_950_000, thirdPartyAmount: 1_380_000,
  },
  {
    id: "wo-0134", code: "OT-2026-0134", client: "Agregados La Calera", clientNit: "860.045.721-9",
    vehicle: { plate: "WFP-198", brand: "International", model: "7600", engine: "Navistar MaxxForce 13", year: 2014, odometerKm: 728_600 },
    service: "Reprogramación ECM + actualización calibración de inyección",
    status: "diagnostico", priority: "baja", technician: "Luis Castaño", openedAt: "2026-09-19", promisedAt: "2026-09-25",
    laborAmount: 850_000, partsAmount: 0, thirdPartyAmount: 1_600_000,
  },
  {
    id: "wo-0133", code: "OT-2026-0133", client: "Frigoríficos Refrigerados del Llano", clientNit: "901.014.662-8",
    vehicle: { plate: "STV-352", brand: "Hino", model: "500 GH", engine: "Hino J08E", year: 2020, odometerKm: 356_200 },
    service: "Cambio de rail de alta presión + sensor de presión de riel",
    status: "recibida", priority: "alta", technician: "Por asignar", openedAt: "2026-09-21", promisedAt: "2026-09-27",
    laborAmount: 1_450_000, partsAmount: 6_720_000, thirdPartyAmount: 0,
  },
  {
    id: "wo-0132", code: "OT-2026-0132", client: "Coordinadora Mercantil", clientNit: "890.904.713-1",
    vehicle: { plate: "SXL-702", brand: "Scania", model: "R450", engine: "Scania DC13", year: 2021, odometerKm: 318_900 },
    service: "Reparación radiador y enfriador EGR + prueba de presión",
    status: "facturada", priority: "media", technician: "Andrés Pulido", openedAt: "2026-08-20", promisedAt: "2026-08-27",
    laborAmount: 1_300_000, partsAmount: 1_900_000, thirdPartyAmount: 2_300_000,
  },
  {
    id: "wo-0131", code: "OT-2026-0131", client: "Buses Intermunicipales del Oriente", clientNit: "800.219.334-5",
    vehicle: { plate: "VKD-164", brand: "Volvo", model: "B12R", engine: "Volvo D12D", year: 2015, odometerKm: 1_210_000 },
    service: "Overhaul turbo + reemplazo de intercooler y mangueras",
    status: "entregada", priority: "media", technician: "Jhon Ramírez", openedAt: "2026-08-18", promisedAt: "2026-08-25",
    laborAmount: 1_750_000, partsAmount: 4_200_000, thirdPartyAmount: 4_140_000,
  },
];

export const thirdPartyJobs: ThirdPartyJob[] = [
  { id: "tp-081", workOrderId: "wo-0142", providerId: "prv-01", description: "Reparación y calibración 6 inyectores common rail Cummins XPI (código QR IMA)", cost: 6_200_000, markupPct: 20, status: "en_proceso", sentAt: "2026-09-16", expectedAt: "2026-09-24" },
  { id: "tp-080", workOrderId: "wo-0140", providerId: "prv-03", description: "Balanceo de cartucho CHRA y calibración actuador VGT Holset HE400", cost: 4_980_000, markupPct: 20, status: "recibido", sentAt: "2026-09-14", expectedAt: "2026-09-20", invoiceRef: "TS-11893" },
  { id: "tp-079", workOrderId: "wo-0139", providerId: "prv-02", description: "Rectificado cigüeñal 0.25 mm + bruñido de camisas y planeado de culata", cost: 7_650_000, markupPct: 20, status: "en_proceso", sentAt: "2026-09-10", expectedAt: "2026-09-30" },
  { id: "tp-078", workOrderId: "wo-0137", providerId: "prv-04", description: "Prueba en banco 6 unidades PLD Bosch + cambio de toberas", cost: 2_380_000, markupPct: 20, status: "pagado", sentAt: "2026-09-03", expectedAt: "2026-09-06", invoiceRef: "CRC-4471" },
  { id: "tp-077", workOrderId: "wo-0135", providerId: "prv-01", description: "Prueba de retorno y codificación de 6 inyectores Bosch CRIN", cost: 1_150_000, markupPct: 20, status: "pagado", sentAt: "2026-08-26", expectedAt: "2026-08-28", invoiceRef: "LDI-20931" },
  { id: "tp-076", workOrderId: "wo-0132", providerId: "prv-05", description: "Reparación panal de radiador y prueba de fugas del enfriador EGR", cost: 1_920_000, markupPct: 20, status: "pagado", sentAt: "2026-08-21", expectedAt: "2026-08-24", invoiceRef: "RIJM-0782" },
  { id: "tp-075", workOrderId: "wo-0131", providerId: "prv-03", description: "Overhaul completo turbo Garrett GT4294 (eje, cojinetes, sellos)", cost: 3_450_000, markupPct: 20, status: "pagado", sentAt: "2026-08-18", expectedAt: "2026-08-22", invoiceRef: "TS-11807" },
  { id: "tp-074", workOrderId: "wo-0134", providerId: "prv-06", description: "Lectura, respaldo y reprogramación de ECM Navistar", cost: 1_330_000, markupPct: 20, status: "cotizado", sentAt: "2026-09-20", expectedAt: "2026-09-25" },
  { id: "tp-073", workOrderId: null, providerId: "prv-04", description: "Cotización: reparación bomba CP3 Bosch (repuesto para stock)", cost: 2_900_000, markupPct: 0, status: "cotizado", sentAt: "2026-09-19", expectedAt: "2026-09-29" },
];

// ---------------------------------------------------------------------------
// Agregados derivados para el dashboard
// ---------------------------------------------------------------------------

export function getFinancialSummary(data: MonthlyFinancials[] = monthlyFinancials) {
  const sum = (pick: (m: MonthlyFinancials) => number) => data.reduce((acc, m) => acc + pick(m), 0);
  const revenue = sum((m) => m.revenue);
  const dieselPartsCost = sum((m) => m.dieselPartsCost);
  const thirdPartyCost = sum((m) => m.thirdPartyCost);
  const laborCost = sum((m) => m.laborCost);
  const overheadCost = sum((m) => m.overheadCost);
  const grossMargin = revenue - dieselPartsCost - thirdPartyCost;

  return {
    revenue,
    dieselPartsCost,
    thirdPartyCost,
    laborCost,
    overheadCost,
    grossMargin,
    grossMarginPct: revenue ? (grossMargin / revenue) * 100 : 0,
  };
}

export function getCostDistribution(data: MonthlyFinancials[] = monthlyFinancials): CostSlice[] {
  const s = getFinancialSummary(data);
  return [
    { key: "diesel", name: "Repuestos diésel", kind: "directo", value: s.dieselPartsCost },
    { key: "terceros", name: "Servicios de terceros", kind: "directo", value: s.thirdPartyCost },
    { key: "mano_obra", name: "Mano de obra", kind: "operativo", value: s.laborCost },
    { key: "gastos", name: "Gastos generales", kind: "operativo", value: s.overheadCost },
  ];
}

/** Variación porcentual entre el último mes y el anterior. */
export function monthOverMonth(pick: (m: MonthlyFinancials) => number, data: MonthlyFinancials[] = monthlyFinancials) {
  const last = data.at(-1);
  const prev = data.at(-2);
  if (!last || !prev || pick(prev) === 0) return 0;
  return ((pick(last) - pick(prev)) / pick(prev)) * 100;
}

export const inventoryItems: InventoryItem[] = [
  { id: "inv-01", sku: "INY-CR-0445120", name: "Inyector common rail Bosch CRIN3", category: "inyeccion", oemRef: "0445120236", stock: 4, minStock: 6, unitCost: 1_580_000 },
  { id: "inv-02", sku: "INY-XPI-2872", name: "Inyector Cummins XPI ISX15", category: "inyeccion", oemRef: "2872544", stock: 7, minStock: 6, unitCost: 2_340_000 },
  { id: "inv-03", sku: "BAP-CP3-0445020", name: "Bomba de alta presión Bosch CP3", category: "bombas", oemRef: "0445020150", stock: 1, minStock: 2, unitCost: 6_950_000 },
  { id: "inv-04", sku: "BAP-DD15-4700", name: "Bomba de alta presión Detroit DD15", category: "bombas", oemRef: "A4720900850", stock: 2, minStock: 1, unitCost: 11_200_000 },
  { id: "inv-05", sku: "TRB-HE400-VG", name: "Turbo Holset HE400VG (remanufacturado)", category: "turbos", oemRef: "5352735", stock: 1, minStock: 1, unitCost: 9_800_000 },
  { id: "inv-06", sku: "TRB-CHRA-GT42", name: "Cartucho CHRA Garrett GT4294", category: "turbos", oemRef: "452235-0001", stock: 3, minStock: 2, unitCost: 2_150_000 },
  { id: "inv-07", sku: "FLT-FS1098", name: "Filtro separador de agua Fleetguard FS1098", category: "filtros", oemRef: "FS1098", stock: 38, minStock: 20, unitCost: 128_000 },
  { id: "inv-08", sku: "FLT-FF5825", name: "Filtro de combustible Fleetguard FF5825NN", category: "filtros", oemRef: "FF5825NN", stock: 12, minStock: 20, unitCost: 96_500 },
  { id: "inv-09", sku: "SEN-RAIL-0281", name: "Sensor de presión de riel Bosch", category: "sensores", oemRef: "0281006164", stock: 5, minStock: 4, unitCost: 640_000 },
  { id: "inv-10", sku: "VAL-IMV-4903", name: "Válvula IMV / reguladora de caudal", category: "sensores", oemRef: "4903290", stock: 2, minStock: 3, unitCost: 870_000 },
  { id: "inv-11", sku: "EMP-JC-ISX", name: "Juego completo empaques ISX15 (overhaul)", category: "empaques", oemRef: "4955595", stock: 2, minStock: 1, unitCost: 3_450_000 },
];

export const invoices: Invoice[] = [
  { id: "inv-fe-10452", number: "FE-10452", workOrderId: "wo-0137", total: 19_872_000, dianStatus: "aceptado", cufe: "c0f3a8…e91d", issuedAt: "2026-09-10" },
  { id: "inv-fe-10451", number: "FE-10451", workOrderId: "wo-0135", total: 6_532_000, dianStatus: "aceptado", cufe: "7ab21c…04fa", issuedAt: "2026-08-31" },
  { id: "inv-fe-10450", number: "FE-10450", workOrderId: "wo-0132", total: 6_545_000, dianStatus: "aceptado_con_notificaciones", cufe: "e41d0b…7c22", issuedAt: "2026-08-28", message: "FAK24: el correo del adquiriente no coincide con el RUT" },
  { id: "inv-pend-01", number: null, workOrderId: "wo-0138", total: 6_462_000, dianStatus: "pendiente", cufe: null, issuedAt: null },
  { id: "inv-rech-01", number: "FE-10449", workOrderId: "wo-0131", total: 11_983_000, dianStatus: "rechazado", cufe: null, issuedAt: "2026-08-26", message: "FAD06: NIT del adquiriente no válido" },
];
