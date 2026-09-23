import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Verifica un secreto compartido. Devuelve una respuesta de error si falla,
 * o null si la petición está autorizada.
 */
export function requireSecret(provided: string | null, expected: string | undefined, envName: string) {
  if (!expected) {
    return NextResponse.json({ error: `Servidor sin configurar: falta ${envName}` }, { status: 500 });
  }
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return null;
}

export function bearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}
