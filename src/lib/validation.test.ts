import { describe, expect, it } from "vitest";

import { addDays, daysBetween, lastMonths, todayBogota } from "./dates";
import { clientSchema, formatNit, newWorkOrderSchema, nitCheckDigit, PLATE_PATTERN } from "./validation";

describe("nitCheckDigit", () => {
  it("coincide con NITs conocidos", () => {
    expect(nitCheckDigit("800197268")).toBe(4); // DIAN
    expect(nitCheckDigit("899999034")).toBe(1); // SENA
    expect(nitCheckDigit("860034313")).toBe(7); // Davivienda
  });

  it("formatea con puntos y DV", () => {
    expect(formatNit("900123456", 8)).toBe("900.123.456-8");
    expect(formatNit("79456123")).toBe("79.456.123");
  });
});

describe("clientSchema", () => {
  const base = {
    kind: "empresa",
    name: "Transportes Prueba S.A.S.",
    idType: "NIT",
    idNumber: "800197268",
    dv: "4",
    phone: "3101234567",
    billingEmail: "",
    city: "Bogotá",
    paymentTermDays: "30",
  };

  it("acepta un cliente válido y convierte el plazo a número", () => {
    const r = clientSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data?.paymentTermDays).toBe(30);
  });

  it("rechaza un dígito de verificación incorrecto", () => {
    const r = clientSchema.safeParse({ ...base, dv: "5" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["dv"]);
  });

  it("no exige DV a personas con cédula", () => {
    expect(clientSchema.safeParse({ ...base, kind: "persona", idType: "CC", idNumber: "79456123", dv: "" }).success).toBe(true);
  });

  it("rechaza teléfonos mal escritos", () => {
    expect(clientSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
  });
});

describe("newWorkOrderSchema", () => {
  it("exige síntomas y kilometraje válidos", () => {
    const r = newWorkOrderSchema.safeParse({ vehicleId: "vh-1", technicianId: "u-1", odometerKm: "-5", priority: "media", symptoms: "no" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(["odometerKm", "symptoms"]);
  });
});

describe("placas", () => {
  it("acepta placas de carro y moto", () => {
    expect(PLATE_PATTERN.test("SNK482")).toBe(true);
    expect(PLATE_PATTERN.test("ABC12D")).toBe(true);
    expect(PLATE_PATTERN.test("SN482")).toBe(false);
  });
});

describe("fechas en Bogotá", () => {
  it("usa la fecha de Bogotá aunque en UTC ya sea el día siguiente", () => {
    expect(todayBogota(new Date("2026-10-10T03:00:00Z"))).toBe("2026-10-09");
  });

  it("suma días y cruza meses", () => {
    expect(addDays("2026-01-30", 3)).toBe("2026-02-02");
    expect(daysBetween("2026-01-01", "2026-03-01")).toBe(59);
    expect(lastMonths("2026-02-15", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
