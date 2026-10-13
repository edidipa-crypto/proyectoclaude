// ---------------------------------------------------------------------------
// Datos de prueba realistas de un centro de servicio diésel. Se generan de forma
// determinística y con fechas relativas a hoy, para que siempre se vean "al día".
// En la Fase 1 este mismo contenido se carga a Supabase como seed.
// ---------------------------------------------------------------------------

import { addDays, daysBetween, todayBogota } from "./dates";
import {
  computeKardex,
  computeTotals,
  computeWithholdings,
  roundCOP,
  thirdPartyPrice,
  VAT_RATE,
  type StockMovement,
} from "./money";
import { nitCheckDigit, formatNit } from "./validation";
import type {
  AppUser,
  Client,
  Expense,
  ExpenseCategory,
  InventoryItem,
  Invoice,
  Payable,
  PaymentMethod,
  ThirdPartyJob,
  ThirdPartyProvider,
  Vehicle,
  WorkOrderEvent,
  WorkOrderLine,
  WorkOrderPriority,
  WorkOrderRecord,
  WorkOrderStatus,
} from "@/types";

/** Precio de la hora de mano de obra (antes de IVA). */
export const LABOR_RATE = 150_000;
/** Costo estimado de una hora técnica (nómina ÷ horas productivas). */
export const LABOR_HOUR_COST = 31_000;
/** Margen por defecto sobre trabajos de terceros. */
export const DEFAULT_THIRD_PARTY_MARKUP = 20;

export interface Database {
  users: AppUser[];
  clients: Client[];
  vehicles: Vehicle[];
  inventory: InventoryItem[];
  movements: StockMovement[];
  providers: ThirdPartyProvider[];
  thirdPartyJobs: ThirdPartyJob[];
  workOrders: WorkOrderRecord[];
  invoices: Invoice[];
  payables: Payable[];
  expenses: Expense[];
}

function random(seed: number) {
  let a = seed;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(list: readonly T[]): T => list[Math.floor(next() * list.length)],
  };
}

// --- Catálogos base -------------------------------------------------------------

const USERS: AppUser[] = [
  { id: "u-admin", name: "Mauricio Rojas", email: "gerencia@dieselpro.co", role: "admin", phone: "3104567812", active: true },
  { id: "u-asesor", name: "Laura Gómez", email: "servicio@dieselpro.co", role: "asesor", phone: "3157894512", active: true },
  { id: "u-jramirez", name: "Jhon Ramírez", email: "jramirez@dieselpro.co", role: "tecnico", phone: "3208974561", active: true },
  { id: "u-cmendoza", name: "Carlos Mendoza", email: "cmendoza@dieselpro.co", role: "tecnico", phone: "3112349876", active: true },
  { id: "u-apulido", name: "Andrés Pulido", email: "apulido@dieselpro.co", role: "tecnico", phone: "3014561237", active: true },
  { id: "u-lcastano", name: "Luis Castaño", email: "lcastano@dieselpro.co", role: "tecnico", phone: "3125550198", active: true },
  { id: "u-conta", name: "Paola Castro", email: "contabilidad@dieselpro.co", role: "contabilidad", phone: "3165478923", active: true },
];
const TECHNICIANS = USERS.filter((u) => u.role === "tecnico").map((u) => u.id);

const ALL_WITHHOLDINGS = { income: true, vat: true, ica: true };
const NO_WITHHOLDINGS = { income: false, vat: false, ica: false };

function company(id: string, name: string, nit: string, extra: Partial<Client>): Client {
  return {
    id,
    kind: "empresa",
    name,
    idType: "NIT",
    idNumber: nit,
    dv: nitCheckDigit(nit),
    phone: "",
    billingEmail: "",
    city: "Bogotá",
    address: "",
    paymentTermDays: 30,
    withholdings: ALL_WITHHOLDINGS,
    ...extra,
  };
}

function person(id: string, name: string, cc: string, extra: Partial<Client>): Client {
  return {
    id,
    kind: "persona",
    name,
    idType: "CC",
    idNumber: cc,
    phone: "",
    billingEmail: "",
    city: "Bogotá",
    address: "",
    paymentTermDays: 0,
    withholdings: NO_WITHHOLDINGS,
    ...extra,
  };
}

const CLIENTS: Client[] = [
  company("cl-01", "Transportes Andinos de Carga S.A.S.", "900123456", { contactName: "Martha Lucía Pinzón", phone: "3106547890", billingEmail: "facturas@andinoscarga.co", city: "Funza", address: "Km 2 vía Funza–Siberia, Bodega 14" }),
  company("cl-02", "Logística Sabana Express S.A.S.", "901552310", { contactName: "Germán Ospina", phone: "3209876543", billingEmail: "flota@sabanaexpress.co", address: "Cra 106 #15A-25, Fontibón", withholdings: { income: true, vat: false, ica: true } }),
  company("cl-03", "Agregados La Calera S.A.S.", "860045721", { contactName: "Fabio Cubillos", phone: "3123456789", billingEmail: "equipos@agregadoslacalera.co", city: "La Calera" }),
  company("cl-04", "Carga Pesada del Centro S.A.S.", "900887410", { contactName: "Diego Arango", phone: "3187654321", billingEmail: "mantenimiento@cargapesada.co", address: "Zona Franca Bogotá, Manzana 8", paymentTermDays: 45 }),
  company("cl-05", "Buses Intermunicipales del Oriente S.A.", "800219334", { contactName: "Sandra Patiño", phone: "3134567890", billingEmail: "taller@busesoriente.co", city: "Villavicencio", paymentTermDays: 30, withholdings: { income: true, vat: false, ica: false } }),
  company("cl-06", "Constructora Vial Cundinamarca S.A.S.", "900887412", { contactName: "Ing. Ricardo Lozano", phone: "3176543210", billingEmail: "maquinaria@vialcundinamarca.co", city: "Sibaté" }),
  company("cl-07", "Frigoríficos Refrigerados del Llano S.A.S.", "901014662", { contactName: "Natalia Ruiz", phone: "3192223311", billingEmail: "logistica@refrigeradosllano.co", paymentTermDays: 15, withholdings: { income: true, vat: true, ica: false } }),
  person("cl-08", "José Alirio Peña", "79456123", { phone: "3112223344", billingEmail: "josealirio.pena@gmail.com", address: "Cll 13 #68-40" }),
  person("cl-09", "Hernando Castiblanco", "19345876", { phone: "3158889900", city: "Mosquera" }),
  person("cl-10", "Luis Eduardo Barrera", "80123456", { phone: "3214445566", city: "Facatativá" }),
];

type VehicleRow = [string, string, string, string, string, string, number, Vehicle["type"], number, number?];
const VEHICLES: Vehicle[] = (
  [
    ["vh-01", "cl-01", "SNK482", "Kenworth", "T800", "Cummins ISX15", 2019, "Tractocamión", 684_200],
    ["vh-02", "cl-01", "SNK511", "Kenworth", "T880", "PACCAR MX-13", 2022, "Tractocamión", 241_700],
    ["vh-03", "cl-01", "SXK913", "International", "ProStar", "Cummins ISX15", 2018, "Tractocamión", 603_150],
    ["vh-04", "cl-02", "TTR915", "Freightliner", "Cascadia", "Detroit DD15", 2020, "Tractocamión", 512_900],
    ["vh-05", "cl-02", "TTR877", "Freightliner", "M2 106", "Cummins ISB 6.7", 2019, "Camión", 402_150],
    ["vh-06", "cl-03", "WFP207", "International", "HX620", "Cummins X15", 2021, "Volqueta", 298_400],
    ["vh-07", "cl-03", "WFP198", "International", "7600", "Navistar MaxxForce 13", 2014, "Volqueta", 728_600],
    ["vh-08", "cl-04", "SXL630", "Volvo", "FH 500", "Volvo D13K", 2018, "Tractocamión", 891_300],
    ["vh-09", "cl-04", "SXL702", "Scania", "R450", "Scania DC13", 2021, "Tractocamión", 318_900],
    ["vh-10", "cl-05", "VKD118", "Mercedes-Benz", "O500 RSD", "OM 457 LA", 2017, "Bus", 1_040_500],
    ["vh-11", "cl-05", "VKD164", "Volvo", "B12R", "Volvo D12D", 2015, "Bus", 1_210_000],
    ["vh-12", "cl-06", "OQT744", "Caterpillar", "725", "CAT C13 ACERT", 2016, "Maquinaria", 0, 14_820],
    ["vh-13", "cl-06", "MAQ416", "Caterpillar", "Retroexcavadora 416F", "CAT C4.4", 2019, "Maquinaria", 0, 6_430],
    ["vh-14", "cl-06", "MAQ200", "Komatsu", "Excavadora PC200-8", "Komatsu SAA6D107E", 2017, "Maquinaria", 0, 11_250],
    ["vh-15", "cl-07", "STV352", "Hino", "500 GH", "Hino J08E", 2020, "Camión", 356_200],
    ["vh-16", "cl-07", "STV389", "Freightliner", "M2 112", "Detroit DD13", 2021, "Camión", 287_600],
    ["vh-17", "cl-08", "SUR654", "Foton", "Auman", "Cummins ISM", 2016, "Tractocamión", 744_900],
    ["vh-18", "cl-09", "SXA906", "Chevrolet", "FTR", "Isuzu 6HK1", 2015, "Camión", 587_200],
    ["vh-19", "cl-10", "SNW118", "Kenworth", "T370", "PACCAR PX-8", 2014, "Volqueta", 421_600],
    ["vh-20", "cl-02", "TTR940", "Kenworth", "T680", "Cummins X15", 2023, "Tractocamión", 156_300],
  ] as VehicleRow[]
).map(([id, clientId, plate, brand, model, engine, year, type, odometerKm, hourMeter]) => ({
  id,
  clientId,
  plate,
  brand,
  model,
  engine,
  year,
  type,
  odometerKm,
  ...(hourMeter !== undefined ? { hourMeter } : {}),
}));

type ItemRow = [string, string, InventoryItem["category"], string, string, string, string, number, number, number, string];
const CATALOG = (
  [
    ["INY-CR-0445120", "Inyector common rail Bosch CRIN3", "inyeccion", "0445120236", "Bosch", "und", "A-01", 1_580_000, 2_150_000, 6, "prv-07"],
    ["INY-XPI-2872", "Inyector Cummins XPI ISX15", "inyeccion", "2872544", "Cummins", "und", "A-01", 2_340_000, 3_150_000, 6, "prv-07"],
    ["ARN-INY-CU", "Arandela de cobre para inyector", "inyeccion", "F00VC17503", "Bosch", "und", "A-02", 6_500, 11_000, 36, "prv-07"],
    ["KIT-SEL-INY6", "Kit sellos y o-rings para 6 inyectores", "empaques", "4089400", "Cummins", "kit", "A-02", 185_000, 265_000, 4, "prv-07"],
    ["BAP-CP3-0445020", "Bomba de alta presión Bosch CP3", "bombas", "0445020150", "Bosch", "und", "B-01", 6_950_000, 9_200_000, 1, "prv-07"],
    ["BAP-DD15-4700", "Bomba de alta presión Detroit DD15", "bombas", "A4720900850", "Detroit", "und", "B-01", 11_200_000, 14_800_000, 1, "prv-07"],
    ["VAL-IMV-4903", "Válvula IMV / reguladora de caudal", "sensores", "4903290", "Cummins", "und", "B-02", 870_000, 1_190_000, 3, "prv-07"],
    ["TRB-HE400-VG", "Turbo Holset HE400VG (remanufacturado)", "turbos", "5352735", "Holset", "und", "C-01", 9_800_000, 12_900_000, 1, "prv-07"],
    ["TRB-CHRA-GT42", "Cartucho CHRA Garrett GT4294", "turbos", "452235-0001", "Garrett", "und", "C-01", 2_150_000, 2_950_000, 2, "prv-07"],
    ["SEN-RAIL-0281", "Sensor de presión de riel Bosch", "sensores", "0281006164", "Bosch", "und", "B-02", 640_000, 890_000, 4, "prv-07"],
    ["VAL-EGR-ISX", "Válvula EGR Cummins ISX", "sensores", "4352654", "Cummins", "und", "B-03", 3_200_000, 4_350_000, 1, "prv-07"],
    ["EMP-JC-ISX", "Juego completo empaques ISX15 (overhaul)", "empaques", "4955595", "Cummins", "jgo", "D-01", 3_450_000, 4_700_000, 1, "prv-07"],
    ["KIT-OVH-ISX", "Kit overhaul ISX15 (pistones, camisas, anillos)", "empaques", "4376337", "Cummins", "kit", "D-01", 18_500_000, 24_500_000, 1, "prv-07"],
    ["CJN-ISX-STD", "Juego cojinetes de bancada y biela STD", "empaques", "4955862", "Clevite", "jgo", "D-02", 1_650_000, 2_250_000, 1, "prv-07"],
    ["FLT-FS1098", "Filtro separador de agua Fleetguard FS1098", "filtros", "FS1098", "Fleetguard", "und", "E-01", 128_000, 185_000, 20, "prv-08"],
    ["FLT-FF5825", "Filtro de combustible Fleetguard FF5825NN", "filtros", "FF5825NN", "Fleetguard", "und", "E-01", 96_500, 142_000, 20, "prv-08"],
    ["FLT-LF9009", "Filtro de aceite Fleetguard LF9009", "filtros", "LF9009", "Fleetguard", "und", "E-01", 68_000, 98_000, 12, "prv-08"],
    ["LUB-15W40-GL", "Aceite motor 15W40 CK-4 (galón)", "lubricantes", "DELVAC-15W40", "Mobil Delvac", "gal", "F-01", 78_000, 112_000, 40, "prv-08"],
    ["REF-ELC-GL", "Refrigerante ELC larga vida (galón)", "lubricantes", "ELC-50", "Shell", "gal", "F-02", 32_000, 48_000, 16, "prv-08"],
  ] as ItemRow[]
).map(([sku, name, category, oemRef, brand, unit, location, baseCost, salePrice, minStock, supplierId], i) => ({
  item: { id: `inv-${String(i + 1).padStart(2, "0")}`, sku, name, category, oemRef, brand, unit, location, stock: 0, minStock, unitCost: 0, salePrice } satisfies InventoryItem,
  baseCost,
  supplierId,
}));

function provider(id: string, name: string, nit: string, type: ThirdPartyProvider["type"], city: string, contact: string, phone: string, paymentTermDays: number): ThirdPartyProvider {
  return { id, name, nit: formatNit(nit, nitCheckDigit(nit)), type, city, contact, phone, paymentTermDays };
}

const PROVIDERS: ThirdPartyProvider[] = [
  provider("prv-01", "Laboratorio Diésel Inyectronic S.A.S.", "900482117", "laboratorio_inyeccion", "Bogotá", "Edwin Salcedo", "3128884567", 15),
  provider("prv-02", "Rectificadora Motores del Norte", "830115902", "rectificadora", "Funza", "Jairo Pulido", "3139995678", 0),
  provider("prv-03", "TurboService Colombia", "901334560", "reparacion_turbos", "Bogotá", "Camilo Reyes", "3162227890", 30),
  provider("prv-04", "Common Rail Center Ltda.", "900771245", "laboratorio_inyeccion", "Mosquera", "Óscar Niño", "3017773456", 30),
  provider("prv-05", "Radiadores Industriales JM", "79456221", "radiadores", "Soacha", "Hugo Martínez", "3151116789", 0),
  provider("prv-06", "ECM Diagnostics Pro", "901228109", "electronica", "Bogotá", "Rubén Cárdenas", "3173338901", 15),
  provider("prv-07", "Distribuidora Diésel Andina S.A.S.", "900876543", "repuestos", "Bogotá", "Felipe Vargas", "3106662345", 45),
  provider("prv-08", "Lubricantes y Filtros del Llano S.A.S.", "901234567", "repuestos", "Bogotá", "Yolanda Barrios", "3145551234", 30),
];

// --- Plantillas de trabajos diésel --------------------------------------------

interface JobTemplate {
  service: string;
  symptoms: string;
  diagnosis: string;
  /** Motores a los que aplica; sin filtro aplica a todos */
  engines?: RegExp;
  labor: [string, number][];
  parts: [string, number][];
  thirdParty?: [string, string, number][];
  weight: number;
}

const ISX = /ISX|X15|ISM/;
const TEMPLATES: JobTemplate[] = [
  { service: "Mantenimiento preventivo de motor (aceite y filtros)", symptoms: "Cumple kilometraje de mantenimiento", diagnosis: "Cambio de aceite y filtros según plan del fabricante. Revisión de fugas y correas.", labor: [["Cambio de aceite, filtros y revisión general", 2.5]], parts: [["LUB-15W40-GL", 11], ["FLT-LF9009", 1], ["FLT-FS1098", 1], ["FLT-FF5825", 1]], weight: 6 },
  { service: "Overhaul de inyectores common rail (6) + calibración en banco", symptoms: "Humo negro, pérdida de potencia y alto consumo", diagnosis: "Inyectores con caudal de retorno fuera de rango. Se envían a laboratorio para reparación y calibración.", labor: [["Desmonte, montaje y codificación de 6 inyectores", 10], ["Diagnóstico electrónico con escáner", 2]], parts: [["ARN-INY-CU", 6], ["KIT-SEL-INY6", 1], ["FLT-FS1098", 1], ["FLT-FF5825", 1]], thirdParty: [["prv-01", "Reparación y calibración de 6 inyectores common rail en banco", 3_600_000]], weight: 4 },
  { service: "Reemplazo de inyectores Cummins XPI (6)", symptoms: "Falla de cilindro y golpeteo en ralentí", diagnosis: "Dos inyectores con tobera fisurada y el resto con desgaste. Se recomienda juego completo.", engines: /ISX|X15/, labor: [["Reemplazo y codificación de 6 inyectores", 7]], parts: [["INY-XPI-2872", 6], ["ARN-INY-CU", 6], ["KIT-SEL-INY6", 1]], weight: 2 },
  { service: "Reemplazo de inyectores common rail Bosch (6)", symptoms: "Arranque difícil y humo blanco en frío", diagnosis: "Inyectores con fuga interna. Prueba de retorno fuera de especificación.", engines: /DD1|MX-13|D13|DC13|J08E|ISB|OM 457/, labor: [["Reemplazo y codificación de 6 inyectores", 7]], parts: [["INY-CR-0445120", 6], ["ARN-INY-CU", 6], ["KIT-SEL-INY6", 1]], weight: 2 },
  { service: "Reemplazo de bomba de alta presión CP3 + purga de sistema", symptoms: "Se apaga en marcha, baja presión de riel", diagnosis: "Bomba CP3 con desgaste interno y limalla en el sistema. Se reemplaza bomba y válvula IMV.", engines: /ISB|J08E|6HK1|PX-8|C4.4|SAA6D/, labor: [["Reemplazo de bomba, purga y lavado del sistema de combustible", 6]], parts: [["BAP-CP3-0445020", 1], ["VAL-IMV-4903", 1], ["FLT-FS1098", 1], ["FLT-FF5825", 1]], weight: 2 },
  { service: "Reemplazo de bomba de alta presión DD15", symptoms: "Código de baja presión de riel y pérdida de potencia", diagnosis: "Bomba de alta presión sin caudal suficiente.", engines: /DD15|DD13/, labor: [["Reemplazo y sincronización de bomba de alta presión", 8]], parts: [["BAP-DD15-4700", 1], ["FLT-FS1098", 1]], weight: 1 },
  { service: "Reparación turbo VGT: cartucho CHRA y actuador", symptoms: "Turbo silba y bota aceite por el escape", diagnosis: "Juego axial en el eje y actuador VGT descalibrado.", labor: [["Desmonte y montaje de turbo", 6]], parts: [["TRB-CHRA-GT42", 1], ["LUB-15W40-GL", 2]], thirdParty: [["prv-03", "Balanceo de cartucho CHRA y calibración de actuador VGT", 1_850_000]], weight: 3 },
  { service: "Reemplazo de turbo Holset HE400VG", symptoms: "Pérdida de potencia en subida", diagnosis: "Turbo con daño en la turbina, no es reparable.", engines: ISX, labor: [["Reemplazo de turbo y prueba de presión de admisión", 7]], parts: [["TRB-HE400-VG", 1], ["LUB-15W40-GL", 2]], weight: 1 },
  { service: "Reparación general de motor: rectificado de cigüeñal y camisas", symptoms: "Consumo de aceite y golpeteo de bancada", diagnosis: "Desgaste de camisas y cojinetes. Se recomienda reparación general.", engines: ISX, labor: [["Reparación general de motor (overhaul)", 95]], parts: [["KIT-OVH-ISX", 1], ["EMP-JC-ISX", 1], ["CJN-ISX-STD", 1], ["LUB-15W40-GL", 11], ["REF-ELC-GL", 8], ["FLT-LF9009", 2], ["FLT-FS1098", 1]], thirdParty: [["prv-02", "Rectificado de cigüeñal, bruñido de camisas y planeado de culata", 4_300_000]], weight: 1 },
  { service: "Diagnóstico falla EGR + limpieza DPF y regeneración forzada", symptoms: "Testigo de motor encendido y modo de protección", diagnosis: "Válvula EGR pegada y filtro de partículas saturado.", labor: [["Diagnóstico, limpieza de DPF y regeneración forzada", 10]], parts: [["VAL-EGR-ISX", 1]], weight: 2 },
  { service: "Cambio de sensor de presión de riel + diagnóstico", symptoms: "Tironeo y se apaga en ralentí", diagnosis: "Sensor de presión de riel con lectura errática.", labor: [["Diagnóstico electrónico y cambio de sensor", 3]], parts: [["SEN-RAIL-0281", 1]], weight: 3 },
  { service: "Reprogramación ECM + actualización de calibración de inyección", symptoms: "Códigos intermitentes de inyección", diagnosis: "Calibración de ECM desactualizada.", labor: [["Diagnóstico y acompañamiento de reprogramación", 3]], parts: [], thirdParty: [["prv-06", "Lectura, respaldo y reprogramación de ECM", 1_330_000]], weight: 2 },
  { service: "Reparación de radiador y enfriador EGR + prueba de presión", symptoms: "Recalentamiento y pérdida de refrigerante", diagnosis: "Panal de radiador obstruido y fuga en el enfriador EGR.", labor: [["Desmonte, montaje y prueba de presión del sistema", 8]], parts: [["REF-ELC-GL", 8]], thirdParty: [["prv-05", "Reparación de panal de radiador y prueba de fugas del enfriador EGR", 1_920_000]], weight: 2 },
  { service: "Pruebas de retorno de inyectores + reemplazo de válvula IMV", symptoms: "Arranque largo en caliente", diagnosis: "Válvula IMV con falla y dos inyectores con retorno alto.", labor: [["Pruebas de retorno y cambio de válvula IMV", 4]], parts: [["VAL-IMV-4903", 1]], thirdParty: [["prv-04", "Prueba de retorno y codificación de inyectores en banco", 1_150_000]], weight: 2 },
];

// --- Generación ---------------------------------------------------------------

export function createSeed(today: string = todayBogota()): Database {
  const rnd = random(20261013);
  const inventory = CATALOG.map((c) => ({ ...c.item }));
  const catalogBySku = new Map(CATALOG.map((c, i) => [c.item.sku, { ...c, item: inventory[i] }]));
  const thirdPartyJobs: ThirdPartyJob[] = [];

  let lineSeq = 0;
  let jobSeq = 0;
  function linesFor(t: JobTemplate, workOrderId: string, openedAt: string): WorkOrderLine[] {
    const lines: WorkOrderLine[] = [];
    for (const [description, hours] of t.labor) {
      lines.push({ id: `ln-${++lineSeq}`, kind: "labor", description, quantity: hours, unitPrice: LABOR_RATE, unitCost: LABOR_HOUR_COST, taxRate: VAT_RATE, discountPct: 0 });
    }
    for (const [sku, quantity] of t.parts) {
      const c = catalogBySku.get(sku)!;
      lines.push({ id: `ln-${++lineSeq}`, kind: "part", description: c.item.name, quantity, unitPrice: c.item.salePrice, unitCost: c.baseCost, taxRate: VAT_RATE, discountPct: 0, itemId: c.item.id });
    }
    for (const [providerId, description, baseCost] of t.thirdParty ?? []) {
      const cost = Math.round((baseCost * (0.92 + rnd.next() * 0.16)) / 10_000) * 10_000;
      const job: ThirdPartyJob = {
        id: `tp-${String(++jobSeq).padStart(3, "0")}`,
        workOrderId,
        providerId,
        description,
        cost,
        markupPct: DEFAULT_THIRD_PARTY_MARKUP,
        status: "enviado",
        sentAt: addDays(openedAt, 1),
        expectedAt: addDays(openedAt, rnd.int(4, 9)),
      };
      thirdPartyJobs.push(job);
      lines.push({ id: `ln-${++lineSeq}`, kind: "third_party", description, quantity: 1, unitPrice: thirdPartyPrice(cost, job.markupPct), unitCost: cost, taxRate: VAT_RATE, discountPct: 0, thirdPartyJobId: job.id });
    }
    return lines;
  }

  const weighted = TEMPLATES.flatMap((t) => Array<JobTemplate>(t.weight).fill(t));
  function templateFor(v: Vehicle): JobTemplate {
    for (;;) {
      const t = rnd.pick(weighted);
      if (!t.engines || t.engines.test(v.engine)) return t;
    }
  }

  const FLOW: WorkOrderStatus[] = ["recibida", "diagnostico", "cotizada", "aprobada", "en_reparacion", "lista", "entregada", "facturada"];
  function historyFor(final: WorkOrderStatus, openedAt: string, technicianId: string, endDate: string, viaThirdParty: boolean): WorkOrderEvent[] {
    const lastIdx = ["esperando_repuestos", "en_tercero"].includes(final) ? FLOW.indexOf("en_reparacion") : FLOW.indexOf(final);
    const steps = FLOW.slice(0, lastIdx + 1);
    if (viaThirdParty && FLOW.indexOf(final) >= FLOW.indexOf("lista")) steps.splice(steps.indexOf("lista"), 0, "en_tercero");
    if (final === "esperando_repuestos" || final === "en_tercero") steps.push(final);
    const span = Math.max(0, daysBetween(openedAt, endDate));
    return steps.map((status, i) => {
      const day = addDays(openedAt, Math.floor((i / Math.max(1, steps.length - 1)) * span));
      const hour = String(7 + ((i * 2 + rnd.int(0, 2)) % 10)).padStart(2, "0");
      const userId =
        status === "recibida" || status === "cotizada" || status === "entregada" ? "u-asesor" : status === "aprobada" ? "u-asesor" : status === "facturada" ? "u-conta" : technicianId;
      const note =
        status === "aprobada" ? "Cliente aprobó la cotización por WhatsApp" : status === "esperando_repuestos" ? "Repuesto pedido al proveedor" : undefined;
      return { at: `${day}T${hour}:${String(rnd.int(0, 5) * 10).padStart(2, "0")}:00-05:00`, status, userId, ...(note ? { note } : {}) };
    });
  }

  // OTs históricas: entre 1 y 2 ingresos por día hábil en los últimos ~13 meses
  const records: Omit<WorkOrderRecord, "code">[] = [];
  let woSeq = 0;
  for (let back = 400; back >= 3; back--) {
    const day = addDays(today, -back);
    if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0) continue; // domingos cerrado
    for (let n = rnd.next() < 0.45 ? 2 : 1; n > 0; n--) {
      const v = rnd.pick(VEHICLES);
      const t = templateFor(v);
      const id = `wo-${++woSeq}`;
      const technicianId = rnd.pick(TECHNICIANS);
      const hours = t.labor.reduce((s, [, h]) => s + h, 0);
      const duration = hours > 40 ? rnd.int(15, 25) : t.thirdParty ? rnd.int(4, 9) : rnd.int(0, 3);
      const deliveredAt = addDays(day, Math.min(duration, back - 1));
      records.push({
        id,
        clientId: v.clientId,
        vehicleId: v.id,
        technicianId,
        service: t.service,
        symptoms: t.symptoms,
        diagnosis: t.diagnosis,
        status: "facturada",
        priority: rnd.pick<WorkOrderPriority>(["baja", "media", "media", "media", "alta"]),
        openedAt: day,
        promisedAt: addDays(day, duration + 1),
        deliveredAt,
        odometerKm: v.type === "Maquinaria" ? 0 : Math.max(5_000, v.odometerKm - Math.round((back * rnd.int(300, 700)) / 10) * 10),
        ...(v.hourMeter !== undefined ? { hourMeter: Math.max(100, v.hourMeter - Math.round(back * 7.5)) } : {}),
        lines: linesFor(t, id, day),
        history: historyFor("facturada", day, technicianId, deliveredAt, Boolean(t.thirdParty)),
      });
    }
  }

  // OTs en el taller hoy: [vehículo, plantilla, estado, días en taller, técnico, prioridad]
  const ACTIVE: [string, number, WorkOrderStatus, number, string | null, WorkOrderPriority][] = [
    ["vh-01", 1, "en_tercero", 6, "u-jramirez", "alta"],
    ["vh-04", 5, "esperando_repuestos", 4, "u-cmendoza", "critica"],
    ["vh-06", 6, "en_reparacion", 3, "u-apulido", "alta"],
    ["vh-08", 8, "en_tercero", 14, "u-jramirez", "media"],
    ["vh-02", 9, "lista", 3, "u-lcastano", "media"],
    ["vh-07", 11, "diagnostico", 1, "u-lcastano", "baja"],
    ["vh-15", 10, "recibida", 0, null, "alta"],
    ["vh-12", 0, "aprobada", 2, "u-apulido", "media"],
    ["vh-10", 3, "cotizada", 2, "u-cmendoza", "media"],
    ["vh-17", 6, "cotizada", 1, "u-jramirez", "alta"],
    ["vh-16", 10, "en_reparacion", 1, "u-lcastano", "media"],
    ["vh-14", 0, "lista", 1, "u-apulido", "baja"],
  ];
  for (const [vehicleId, templateIdx, status, back, technicianId, priority] of ACTIVE) {
    const v = VEHICLES.find((x) => x.id === vehicleId)!;
    const t = TEMPLATES[templateIdx];
    const id = `wo-${++woSeq}`;
    const openedAt = addDays(today, -back);
    const quoted = !["recibida", "diagnostico"].includes(status);
    records.push({
      id,
      clientId: v.clientId,
      vehicleId,
      technicianId,
      service: t.service,
      symptoms: t.symptoms,
      ...(status !== "recibida" ? { diagnosis: t.diagnosis } : {}),
      status,
      priority,
      openedAt,
      promisedAt: addDays(openedAt, t.thirdParty ? 9 : 4),
      odometerKm: v.odometerKm,
      ...(v.hourMeter !== undefined ? { hourMeter: v.hourMeter } : {}),
      lines: quoted ? linesFor(t, id, openedAt) : [],
      history: historyFor(status, openedAt, technicianId ?? "u-asesor", today, false),
    });
  }

  records.sort((a, b) => a.openedAt.localeCompare(b.openedAt));
  const workOrders: WorkOrderRecord[] = records.map((r, i) => ({ ...r, code: `OT-${r.openedAt.slice(0, 4)}-${String(101 + i).padStart(4, "0")}` }));
  const codeById = new Map(workOrders.map((w) => [w.id, w.code]));

  // --- Inventario: compras y salidas a OT (kárdex) ------------------------------
  const movements: StockMovement[] = [];
  const payables: Payable[] = [];
  const balance = new Map(inventory.map((i) => [i.id, 0]));
  let movSeq = 0;
  let payableSeq = 0;
  let purchaseSeq = 7400;

  function purchase(itemId: string, date: string, quantity: number) {
    const c = CATALOG.find((x) => x.item.id === itemId)!;
    const cost = roundCOP((c.baseCost * (0.96 + rnd.next() * 0.1)) / 100) * 100;
    const supplier = PROVIDERS.find((p) => p.id === c.supplierId)!;
    const invoiceRef = `${supplier.id === "prv-07" ? "DDA" : "LFL"}-${++purchaseSeq}`;
    movements.push({ id: `mv-${++movSeq}`, itemId, date, type: "entrada", quantity, unitCost: cost, reference: `Compra ${invoiceRef}` });
    balance.set(itemId, balance.get(itemId)! + quantity);
    payables.push({
      id: `cxp-${++payableSeq}`,
      providerId: supplier.id,
      invoiceRef,
      date,
      dueDate: addDays(date, supplier.paymentTermDays),
      concept: `${quantity} ${c.item.unit} · ${c.item.name}`,
      amount: roundCOP(quantity * cost * (1 + VAT_RATE / 100)),
      payments: [],
    });
  }

  for (const c of CATALOG) purchase(c.item.id, addDays(today, -420), c.item.minStock * 2);

  for (const wo of workOrders) {
    if (!["aprobada", "en_reparacion", "esperando_repuestos", "en_tercero", "lista", "entregada", "facturada"].includes(wo.status)) continue;
    for (const line of wo.lines) {
      if (line.kind !== "part" || !line.itemId) continue;
      const item = inventory.find((i) => i.id === line.itemId)!;
      if (balance.get(item.id)! < line.quantity) {
        purchase(item.id, addDays(wo.openedAt, -1), line.quantity - balance.get(item.id)! + item.minStock * rnd.int(1, 2));
      }
      balance.set(item.id, balance.get(item.id)! - line.quantity);
      movements.push({ id: `mv-${++movSeq}`, itemId: item.id, date: wo.openedAt, type: "salida", quantity: line.quantity, unitCost: 0, reference: wo.code });
      // Casi siempre se repone cuando el repuesto queda en el mínimo. Se fecha el mismo día
      // (las entradas van antes que las salidas del día) para que el kárdex nunca quede en negativo.
      const left = balance.get(item.id)!;
      if (left <= item.minStock && wo.openedAt < addDays(today, -10) && rnd.next() < 0.85) {
        purchase(item.id, wo.openedAt, item.minStock * 2 - left);
      }
    }
  }

  // Un ajuste por conteo físico, el mismo día de una compra para no quedar en negativo
  const oil = catalogBySku.get("LUB-15W40-GL")!.item.id;
  const oilPurchase = movements.filter((m) => m.itemId === oil && m.type === "entrada").at(-2);
  if (oilPurchase) {
    movements.push({ id: `mv-${++movSeq}`, itemId: oil, date: oilPurchase.date, type: "ajuste", quantity: -2, unitCost: 0, reference: "Ajuste por conteo físico" });
  }

  const order = (m: StockMovement) => (m.type === "entrada" ? 0 : 1);
  movements.sort((a, b) => a.date.localeCompare(b.date) || order(a) - order(b));
  const exitCost = new Map<string, number>();
  for (const item of inventory) {
    const kardex = computeKardex(movements.filter((m) => m.itemId === item.id));
    for (const k of kardex) if (k.type === "salida") exitCost.set(`${k.reference}|${item.id}`, k.unitCost);
    item.stock = kardex.at(-1)?.balance ?? 0;
    item.unitCost = kardex.at(-1)?.averageCost ?? 0;
  }
  for (const wo of workOrders) {
    for (const line of wo.lines) {
      if (!line.itemId) continue;
      line.unitCost = exitCost.get(`${wo.code}|${line.itemId}`) ?? inventory.find((i) => i.id === line.itemId)!.unitCost;
    }
  }

  // --- Estado de los trabajos de terceros según la OT -----------------------------
  const woById = new Map(workOrders.map((w) => [w.id, w]));
  for (const job of thirdPartyJobs) {
    const wo = woById.get(job.workOrderId!)!;
    const p = PROVIDERS.find((x) => x.id === job.providerId)!;
    if (wo.status === "en_tercero") job.status = "en_proceso";
    else if (["cotizada", "aprobada"].includes(wo.status)) job.status = "cotizado";
    else if (["lista", "entregada", "facturada"].includes(wo.status)) {
      job.invoiceRef = `${p.name.replace(/[^A-Z]/g, "").slice(0, 3)}-${10_000 + Number(job.id.slice(3))}`;
      job.status = "recibido";
      payables.push({
        id: `cxp-${++payableSeq}`,
        providerId: p.id,
        invoiceRef: job.invoiceRef,
        date: job.expectedAt,
        dueDate: addDays(job.expectedAt, p.paymentTermDays),
        concept: `${codeById.get(wo.id)} · ${job.description}`,
        amount: roundCOP(job.cost * (1 + VAT_RATE / 100)),
        payments: [],
      });
    }
  }

  // Pagos a proveedores: lo que venció hace rato está pagado
  for (const p of payables) {
    if (p.dueDate < addDays(today, -3) && rnd.next() < 0.94) {
      p.payments.push({ date: p.dueDate, amount: p.amount, method: "Transferencia" });
    } else if (p.date < addDays(today, -10) && rnd.next() < 0.3) {
      p.payments.push({ date: addDays(p.date, 5), amount: roundCOP(p.amount / 2), method: "Transferencia" });
    }
  }
  for (const job of thirdPartyJobs) {
    const paid = payables.find((p) => p.invoiceRef === job.invoiceRef);
    if (paid && paid.payments.reduce((s, x) => s + x.amount, 0) >= paid.amount) job.status = "pagado";
  }

  // --- Facturas y abonos ------------------------------------------------------------
  const invoices: Invoice[] = [];
  let invoiceSeq = 10_300;
  const methods: PaymentMethod[] = ["Transferencia", "Transferencia", "Efectivo", "Nequi", "Tarjeta"];
  const recentlyDelivered = workOrders.filter((w) => w.deliveredAt && daysBetween(w.deliveredAt, today) <= 2);
  for (const wo of recentlyDelivered) {
    wo.status = "entregada";
    wo.history = wo.history.filter((h) => h.status !== "facturada");
  }
  for (const wo of workOrders) {
    if (!wo.deliveredAt || !["entregada", "facturada"].includes(wo.status)) continue;
    const client = CLIENTS.find((c) => c.id === wo.clientId)!;
    const totals = computeTotals(wo.lines);
    const net = computeWithholdings(totals, client.withholdings).netPayable;
    const pending = wo.status === "entregada";
    const issuedAt = wo.deliveredAt;
    const dueDate = addDays(issuedAt, client.paymentTermDays);
    const overdueDays = daysBetween(dueDate, today);
    const payments: Invoice["payments"] = [];
    if (!pending) {
      if (client.paymentTermDays === 0) payments.push({ date: issuedAt, amount: net, method: rnd.pick(methods) });
      else if (overdueDays > 20 && rnd.next() < 0.95) payments.push({ date: addDays(dueDate, rnd.int(-5, 15)), amount: net, method: "Transferencia" });
      else if (rnd.next() < 0.35) payments.push({ date: addDays(issuedAt, rnd.int(3, 15)), amount: Math.round((net * 0.4) / 1000) * 1000, method: "Transferencia" });
    }
    const number = pending ? null : `FE-${++invoiceSeq}`;
    invoices.push({
      id: `fe-${invoices.length + 1}`,
      number,
      workOrderId: wo.id,
      clientId: client.id,
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total,
      netPayable: net,
      dianStatus: pending ? "pendiente" : "aceptado",
      cufe: pending ? null : `${(invoiceSeq * 2654435761).toString(16).slice(0, 6)}…${(invoiceSeq * 40503).toString(16).slice(-4)}`,
      issuedAt: pending ? null : issuedAt,
      dueDate: pending ? null : dueDate,
      payments,
    });
  }
  // Dos casos reales de la DIAN para que se vean en Facturación
  const accepted = invoices.filter((i) => i.dianStatus === "aceptado");
  const withNotes = accepted.at(-3);
  if (withNotes) {
    withNotes.dianStatus = "aceptado_con_notificaciones";
    withNotes.message = "FAK24: el correo del adquiriente no coincide con el RUT";
  }
  const rejected = accepted.at(-5);
  if (rejected) {
    rejected.dianStatus = "rechazado";
    rejected.cufe = null;
    rejected.payments = [];
    rejected.message = "FAD06: NIT del adquiriente no válido";
    const wo = woById.get(rejected.workOrderId)!;
    wo.status = "entregada";
    wo.history = wo.history.filter((h) => h.status !== "facturada");
  }

  // --- Gastos generales ------------------------------------------------------------
  const expenses: Expense[] = [];
  let expenseSeq = 0;
  const [ty, tm] = today.split("-").map(Number);
  for (let back = 13; back >= 0; back--) {
    const first = new Date(Date.UTC(ty, tm - 1 - back, 1)).toISOString().slice(0, 10);
    const rows: [number, ExpenseCategory, string, number][] = [
      [5, "Arriendo", "Arriendo bodega taller", 8_000_000],
      [28, "Nómina técnicos", "Nómina 4 técnicos + prestaciones", 21_800_000],
      [28, "Nómina administrativa", "Nómina gerencia, servicio y contabilidad", 8_600_000],
      [20, "Seguridad social", "Aportes salud, pensión, ARL y parafiscales", 6_400_000],
      [10, "Servicios públicos", "Energía (banco de pruebas y compresores)", 1_900_000 + rnd.int(-20, 20) * 10_000],
      [10, "Servicios públicos", "Agua, internet y telefonía", 620_000 + rnd.int(-5, 5) * 10_000],
      [15, "Honorarios", "Contador y revisoría", 2_200_000],
      [rnd.int(3, 25), "Herramientas e insumos", "Insumos de taller y consumibles", rnd.int(80, 160) * 10_000],
      [rnd.int(3, 25), "Publicidad", "Pauta digital y material POP", 600_000],
    ];
    if (back % 4 === 1) rows.push([rnd.int(5, 25), "Herramientas e insumos", "Herramienta especializada / software de diagnóstico", rnd.int(20, 60) * 100_000]);
    for (const [d, category, description, amount] of rows) {
      const date = addDays(first, Math.min(d, 28) - 1);
      if (date > today) continue;
      expenses.push({ id: `gs-${++expenseSeq}`, date, category, description, amount });
    }
  }

  return {
    users: USERS.map((u) => ({ ...u })),
    clients: CLIENTS.map((c) => ({ ...c })),
    vehicles: VEHICLES.map((v) => ({ ...v })),
    inventory,
    movements,
    providers: PROVIDERS.map((p) => ({ ...p })),
    thirdPartyJobs: thirdPartyJobs.sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    workOrders: workOrders.reverse(),
    invoices: invoices.reverse(),
    payables: payables.sort((a, b) => b.date.localeCompare(a.date)),
    expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)),
  };
}
