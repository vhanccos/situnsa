import { describe, expect, it } from "vitest";
import { hashearClaveTest, verificarClave } from "./hash.js";
import {
  estaBloqueado,
  expiracionRefresh,
  firmarAcceso,
  hashRefresh,
  nuevoRefresh,
  proximoEstadoIntento,
  verificarAcceso,
} from "./sesiones.js";

describe("hash bcrypt", () => {
  it("verifica la clave correcta y rechaza otra", () => {
    const h = hashearClaveTest("x");
    expect(verificarClave("x", h)).toBe(true);
    expect(verificarClave("otra", h)).toBe(false);
    expect(verificarClave("x", "no-es-hash")).toBe(false);
  });
});

describe("sesiones JWT + refresh", () => {
  it("firma y verifica el acceso (15 min)", () => {
    const t = firmarAcceso({ sub: "u1", dni: "00000001", rol: "ADMIN_FIPS" });
    const p = verificarAcceso(t);
    expect(p).toMatchObject({ sub: "u1", dni: "00000001", rol: "ADMIN_FIPS" });
    expect(verificarAcceso("basura")).toBeNull();
  });

  it("refresh opaco con hash sha256 estable", () => {
    const { token, hash } = nuevoRefresh();
    expect(token.length).toBeGreaterThan(32);
    expect(hash).toBe(hashRefresh(token));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("expira en 8h", () => {
    const desde = new Date("2026-01-01T00:00:00Z");
    expect(expiracionRefresh(desde).toISOString()).toBe("2026-01-01T08:00:00.000Z");
  });
});

describe("bloqueo 5×15min", () => {
  const ahora = new Date("2026-01-01T00:00:00Z");
  it("éxito resetea", () => {
    expect(proximoEstadoIntento(4, true, ahora)).toEqual({ fallidos: 0, bloqueadoHasta: null });
  });
  it("4 fallos acumulan sin bloquear", () => {
    expect(proximoEstadoIntento(3, false, ahora)).toEqual({ fallidos: 4, bloqueadoHasta: null });
  });
  it("el 5º fallo bloquea 15 min y resetea el contador", () => {
    const r = proximoEstadoIntento(4, false, ahora);
    expect(r.fallidos).toBe(0);
    expect(r.bloqueadoHasta?.toISOString()).toBe("2026-01-01T00:15:00.000Z");
  });
  it("estaBloqueado respeta el tiempo", () => {
    expect(estaBloqueado(new Date("2026-01-01T00:15:00Z"), ahora)).toBe(true);
    expect(estaBloqueado(new Date("2025-12-31T23:59:00Z"), ahora)).toBe(false);
    expect(estaBloqueado(null, ahora)).toBe(false);
  });
});
