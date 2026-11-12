"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { changeWorkOrderStatus, createClient, createVehicle, createWorkOrder, getClient, getClients, getUser, getVehicles, getWorkOrder } from "@/lib/data";
import { can, HOME_BY_ROLE, NEXT_STATUSES, technicianCanMoveTo } from "@/lib/permissions";
import { currentUser, SESSION_COOKIE } from "@/lib/session";
import { clientSchema, fieldErrors, newWorkOrderSchema, vehicleSchema } from "@/lib/validation";
import type { WorkOrderStatus } from "@/types";

/** Mensaje entendible cuando falla el guardado (por ejemplo, Google Sheets no responde). */
function saveError(error: unknown): FormState {
  console.error(error);
  return { message: `No se pudo guardar. ${error instanceof Error ? error.message : ""} Intenta de nuevo en un momento.` };
}

export interface FormState {
  errors?: Record<string, string>;
  message?: string;
}

export async function signIn(formData: FormData) {
  const user = await getUser(String(formData.get("userId")));
  if (!user || !user.active) redirect("/login");
  cookies().set(SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", path: "/" });
  redirect(HOME_BY_ROLE[user.role]);
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
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
