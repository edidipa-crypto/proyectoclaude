"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { changeWorkOrderStatus, createClient, createWorkOrder, getUser, getWorkOrder } from "@/lib/data";
import { can, HOME_BY_ROLE, NEXT_STATUSES, technicianCanMoveTo } from "@/lib/permissions";
import { currentUser, SESSION_COOKIE } from "@/lib/session";
import { clientSchema, fieldErrors, newWorkOrderSchema } from "@/lib/validation";
import type { WorkOrderStatus } from "@/types";

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
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function saveWorkOrder(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user || !can(user.role, "work-orders")) return { message: "No tienes permiso para abrir órdenes de trabajo." };
  const parsed = newWorkOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const wo = await createWorkOrder(parsed.data, user.id);
  revalidatePath("/work-orders");
  redirect(`/work-orders/${wo.id}`);
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
