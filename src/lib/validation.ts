import { z } from "zod";

/** Dígito de verificación del NIT según el algoritmo de la DIAN. */
export function nitCheckDigit(nit: string): number {
  const weights = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const digits = nit.replace(/\D/g, "").split("").reverse();
  const sum = digits.reduce((s, d, i) => s + Number(d) * weights[i], 0);
  const rest = sum % 11;
  return rest > 1 ? 11 - rest : rest;
}

/** "900123456" → "900.123.456-7" */
export function formatNit(nit: string, dv?: number): string {
  const grouped = nit.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return dv === undefined ? grouped : `${grouped}-${dv}`;
}

const required = (field: string) => z.string().trim().min(1, `${field} es obligatorio`);

export const clientSchema = z
  .object({
    kind: z.enum(["empresa", "persona"]),
    name: required("El nombre").max(120),
    idType: z.enum(["NIT", "CC"]),
    idNumber: z.string().trim().regex(/^\d{5,10}$/, "Escribe solo números (5 a 10 dígitos)"),
    dv: z.string().trim().optional(),
    phone: z.string().trim().regex(/^3\d{9}$|^60\d{8}$/, "Celular de 10 dígitos (3xx) o fijo 60x"),
    billingEmail: z.union([z.literal(""), z.string().email("Correo no válido")]),
    city: required("La ciudad"),
    address: z.string().trim().max(160).optional(),
    paymentTermDays: z.coerce.number().int().min(0).max(120),
  })
  .superRefine((v, ctx) => {
    if (v.idType !== "NIT") return;
    if (!v.dv) {
      ctx.addIssue({ code: "custom", path: ["dv"], message: "Falta el dígito de verificación" });
    } else if (Number(v.dv) !== nitCheckDigit(v.idNumber)) {
      ctx.addIssue({ code: "custom", path: ["dv"], message: "El dígito de verificación no coincide con el NIT" });
    }
  });

export const PLATE_PATTERN = /^[A-Z]{3}\d{3}$|^[A-Z]{3}\d{2}[A-Z]$/;

export const newWorkOrderSchema = z.object({
  vehicleId: required("El vehículo"),
  technicianId: required("El técnico"),
  odometerKm: z.coerce.number().int("Sin decimales").min(0).max(5_000_000),
  priority: z.enum(["baja", "media", "alta", "critica"]),
  symptoms: z.string().trim().min(5, "Describe lo que reporta el cliente (mínimo 5 letras)").max(500),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type NewWorkOrderInput = z.infer<typeof newWorkOrderSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
