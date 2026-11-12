import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/data";
import { safeEqual } from "@/lib/password";
import { can, type Section } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Sesión: cookie firmada "idUsuario.vence.firma". Sin la llave del servidor no se
// puede fabricar una sesión de otro usuario.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "dieselpro_session";
const SESSION_DAYS = 7;

/** Hay contraseña de administrador configurada: se exige usuario y contraseña. */
export function passwordLoginEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function secret(): string {
  return process.env.SESSION_SECRET || (process.env.ADMIN_PASSWORD ? `dieselpro:${process.env.ADMIN_PASSWORD}` : "dieselpro-solo-local");
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionValue(userId: string, now = Date.now()): string {
  const payload = `${userId}.${now + SESSION_DAYS * 86_400_000}`;
  return `${payload}.${sign(payload)}`;
}

/** Devuelve el id del usuario si la sesión es auténtica y no ha vencido. */
export function readSessionValue(value: string | undefined, now = Date.now()): string | null {
  const parts = (value ?? "").split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, signature] = parts;
  if (!safeEqual(signature, sign(`${userId}.${expires}`))) return null;
  return Number(expires) > now ? userId : null;
}

export function startSession(userId: string) {
  cookies().set(SESSION_COOKIE, createSessionValue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function endSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function currentUser() {
  const id = readSessionValue(cookies().get(SESSION_COOKIE)?.value);
  if (!id) return undefined;
  const user = await getUser(id);
  return user?.active ? user : undefined;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Devuelve el usuario si tiene acceso a la sección, o null para mostrar "sin acceso". */
export async function userWithAccess(section: Section) {
  const user = await requireUser();
  return can(user.role, section) ? user : null;
}
