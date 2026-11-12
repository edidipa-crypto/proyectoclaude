import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";
import { createSessionValue, readSessionValue } from "./session";

describe("contraseñas", () => {
  it("guarda la contraseña cifrada y la reconoce", async () => {
    const stored = await hashPassword("CocoDiesel2026");
    expect(stored).not.toContain("CocoDiesel2026");
    expect(await verifyPassword("CocoDiesel2026", stored)).toBe(true);
    expect(await verifyPassword("cocodiesel2026", stored)).toBe(false);
  });

  it("cada vez cifra distinto la misma contraseña", async () => {
    expect(await hashPassword("igual12345")).not.toBe(await hashPassword("igual12345"));
  });

  it("rechaza usuarios sin contraseña asignada", async () => {
    expect(await verifyPassword("lo-que-sea", undefined)).toBe(false);
    expect(await verifyPassword("lo-que-sea", "")).toBe(false);
  });
});

describe("sesión firmada", () => {
  const now = Date.UTC(2026, 10, 12);

  it("acepta la sesión que firmó el servidor", () => {
    expect(readSessionValue(createSessionValue("u-dueno", now), now + 1000)).toBe("u-dueno");
  });

  it("rechaza una sesión modificada para hacerse pasar por otro usuario", () => {
    const [, expires, signature] = createSessionValue("u-tecnico2", now).split(".");
    expect(readSessionValue(`u-dueno.${expires}.${signature}`, now)).toBeNull();
    expect(readSessionValue("u-dueno", now)).toBeNull();
    expect(readSessionValue(undefined, now)).toBeNull();
  });

  it("vence a los 7 días", () => {
    const value = createSessionValue("u-dueno", now);
    expect(readSessionValue(value, now + 6 * 86_400_000)).toBe("u-dueno");
    expect(readSessionValue(value, now + 8 * 86_400_000)).toBeNull();
  });
});
