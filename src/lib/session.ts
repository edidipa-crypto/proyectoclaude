import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUser } from "@/lib/data";
import { can, type Section } from "@/lib/permissions";

// ---------------------------------------------------------------------------
// Sesión de prueba: se elige un usuario en /login. En la Fase 1 se reemplaza
// por Supabase Auth (correo + contraseña) sin cambiar quién llama a estas funciones.
// ---------------------------------------------------------------------------

export const SESSION_COOKIE = "dieselpro_user";

export async function currentUser() {
  const id = cookies().get(SESSION_COOKIE)?.value;
  return id ? getUser(id) : undefined;
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
