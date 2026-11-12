"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { z } from "zod";

import {
  changeWorkOrderStatus,
  createClient,
  createVehicle,
  createWorkOrder,
  findUserByEmail,
  getClient,
  getClients,
  getImportSnapshot,
  getUser,
  getUsers,
  getVehicles,
  getWorkOrder,
  saveImported,
  setUserPassword,
} from "@/lib/data";
import { MAX_ROWS, planImport } from "@/lib/import";
import { hashPassword, safeEqual, verifyPassword } from "@/lib/password";
import { can, HOME_BY_ROLE, NEXT_STATUSES, technicianCanMoveTo } from "@/lib/permissions";
import { currentUser, endSession, passwordLoginEnabled, startSession } from "@/lib/session";
import { clientSchema, fieldErrors, newWorkOrderSchema, vehicleSchema } from "@/lib/validation";
import type { WorkOrderStatus } from "@/types";

const importSchema = z.object({
  kind: z.enum(["clients", "vehicles", "workOrders"]),
  rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()]))).max(MAX_ROWS),
  mapping: z.record(z.string(), z.number().int().min(-1)),
  options: z.object({ pricesIncludeVat: z.boolean() }),
  firstLine: z.number().int().min(1),
});

export interface ImportResult {
  ok: boolean;
  message: string;
  created?: { clients: number; vehicles: number; workOrders: number };
}

/** Vuelve a revisar en el servidor lo que el navegador mostró en la vista previa y lo guarda. */
export async function importData(input: unknown): Promise<ImportResult> {
  const user = await currentUser();
  if (!user || !can(user.role, "import")) return { ok: false, message: "No tienes permiso para cargar datos." };
  const parsed = importSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "El archivo enviado no tiene el formato esperado." };
  const { kind, rows, mapping, options, firstLine } = parsed.data;

  let sequence = 0;
  const stamp = Date.now().toString(36);
  const plan = planImport(kind, rows, mapping, await getImportSnapshot(), options, (p) => `${p}-${stamp}${(++sequence).toString(36)}`, firstLine);
  if (plan.warnings.some((w) => w.startsWith("Falta"))) return { ok: false, message: plan.warnings[0] };
  const created = { clients: plan.clients.length, vehicles: plan.vehicles.length, workOrders: plan.workOrders.length };
  if (created.clients + created.vehicles + created.workOrders === 0) return { ok: false, message: "No hay registros nuevos para guardar." };

  try {
    // Las OTs importadas quedan a nombre de quien hizo la carga en el historial
    for (const w of plan.workOrders) w.history = w.history.map((h) => ({ ...h, userId: user.id }));
    await saveImported(plan);
  } catch (error) {
    return { ok: false, message: saveError(error).message ?? "No se pudo guardar." };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Datos cargados.", created };
}

/** Mensaje entendible cuando falla el guardado (por ejemplo, Google Sheets no responde). */
function saveError(error: unknown): FormState {
  console.error(error);
  return { message: `No se pudo guardar. ${error instanceof Error ? error.message : ""} Intenta de nuevo en un momento.` };
}

export interface FormState {
  errors?: Record<string, string>;
  message?: string;
  /** El mensaje es de éxito, no de error */
  ok?: boolean;
}

const LOGIN_ERROR = "Usuario o contraseña incorrectos.";

/**
 * Entrar con usuario y contraseña.
 * - Usuario "admin" + ADMIN_PASSWORD (variable de entorno): entra el primer administrador activo.
 * - Correo + la contraseña que el administrador le asignó a esa persona.
 */
export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { message: "Escribe tu usuario y tu contraseña." };

  let userId: string | undefined;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (login.toLowerCase() === "admin" && adminPassword && safeEqual(password, adminPassword)) {
    userId = (await getUsers()).find((u) => u.role === "admin" && u.active)?.id;
  } else {
    const user = await findUserByEmail(login);
    if (user?.active && (await verifyPassword(password, user.passwordHash))) userId = user.id;
  }
  if (!userId) {
    await new Promise((r) => setTimeout(r, 800)); // frena los intentos repetidos
    return { message: LOGIN_ERROR };
  }
  const user = (await getUser(userId))!;
  startSession(user.id);
  redirect(HOME_BY_ROLE[user.role]);
}

/** Solo sin contraseña de administrador configurada (uso local de prueba): elegir un rol. */
export async function signInDemo(formData: FormData) {
  if (passwordLoginEnabled()) redirect("/login");
  const user = await getUser(String(formData.get("userId")));
  if (!user || !user.active) redirect("/login");
  startSession(user.id);
  redirect(HOME_BY_ROLE[user.role]);
}

export async function signOut() {
  endSession();
  redirect("/login");
}

/** El administrador asigna o cambia la contraseña de una persona. */
export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await currentUser();
  if (!admin || !can(admin.role, "users")) return { message: "No tienes permiso para cambiar contraseñas." };
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  const target = await getUser(userId);
  if (!target) return { message: "Elige la persona." };
  if (!target.email.trim()) return { errors: { userId: "Esa persona no tiene correo; agrégalo en la pestaña Usuarios de la hoja: es su usuario para entrar." } };
  if (password.length < 8) return { errors: { password: "Mínimo 8 caracteres." } };
  try {
    await setUserPassword(userId, await hashPassword(password));
  } catch (error) {
    return saveError(error);
  }
  revalidatePath("/users");
  return { ok: true, message: `Listo: ${target.name} ya puede entrar con ${target.email} y esa contraseña.` };
}

export async function saveClient(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user || !can(user.role, "clients") || user.role === "contabilidad") {
    return { message: "No tienes permiso para crear clientes." };
  }
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const duplicate = (await getClients()).find((c) => c.idNumber === d.idNumber);
  if (duplicate) return { errors: { idNumber: `Ya existe: ${duplicate.name}` } };
  let clientId: string;
  try {
    const client = await createClient({
      kind: d.kind,
      name: d.name,
      idType: d.idType,
      idNumber: d.idNumber,
      ...(d.idType === "NIT" ? { dv: Number(d.dv) } : {}),
      phone: d.phone,
      billingEmail: d.billingEmail,
      city: d.city,
      address: d.address ?? "",
      paymentTermDays: d.paymentTermDays,
      // Por defecto las empresas practican retención en la fuente; se ajusta con el contador.
      withholdings: { income: d.kind === "empresa", vat: false, ica: false },
    });
    clientId = client.id;
  } catch (error) {
    return saveError(error);
  }
  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function saveVehicle(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user || !can(user.role, "work-orders")) return { message: "No tienes permiso para registrar vehículos." };
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (!(await getClient(d.clientId))) return { message: "Cliente no encontrado." };
  const existing = (await getVehicles()).find((v) => v.plate === d.plate);
  if (existing) return { errors: { plate: `La placa ${d.plate} ya está registrada` } };
  const isMachine = d.type === "Maquinaria";
  try {
    await createVehicle({
      clientId: d.clientId,
      plate: d.plate,
      type: d.type,
      brand: d.brand,
      model: d.model,
      engine: d.engine,
      year: d.year,
      odometerKm: isMachine ? 0 : d.reading,
      ...(isMachine ? { hourMeter: d.reading } : {}),
    });
  } catch (error) {
    return saveError(error);
  }
  revalidatePath(`/clients/${d.clientId}`);
  redirect(`/clients/${d.clientId}`);
}

export async function saveWorkOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user || !can(user.role, "work-orders")) return { message: "No tienes permiso para abrir órdenes de trabajo." };
  const parsed = newWorkOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  let workOrderId: string;
  try {
    workOrderId = (await createWorkOrder(parsed.data, user.id)).id;
  } catch (error) {
    return saveError(error);
  }
  revalidatePath("/work-orders");
  redirect(`/work-orders/${workOrderId}`);
}

export async function advanceWorkOrder(formData: FormData) {
  const user = await currentUser();
  const wo = await getWorkOrder(String(formData.get("workOrderId")));
  const status = String(formData.get("status")) as WorkOrderStatus;
  if (!user || !wo || !NEXT_STATUSES[wo.status].includes(status)) return;

  const isOwnTechnician = user.role === "tecnico" && wo.technicianId === user.id;
  const allowed = can(user.role, "work-orders") || (isOwnTechnician && technicianCanMoveTo(status));
  if (!allowed) return;

  const note = String(formData.get("note") ?? "").trim().slice(0, 300) || undefined;
  await changeWorkOrderStatus(wo.id, status, user.id, note);
  revalidatePath("/", "layout");
}
