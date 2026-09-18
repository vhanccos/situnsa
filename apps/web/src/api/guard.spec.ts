import { describe, expect, it } from "vitest";
import { esStaff, redirigirSiNoPuede } from "./guard.js";

describe("redirigirSiNoPuede", () => {
  it("sin sesión → /login en rutas protegidas", () => {
    expect(redirigirSiNoPuede(null, "/admin")).toBe("/login");
    expect(redirigirSiNoPuede(null, "/expedientes/abc")).toBe("/login");
  });
  it("raíz y login siempre pasan", () => {
    expect(redirigirSiNoPuede(null, "/")).toBeNull();
    expect(redirigirSiNoPuede(null, "/login")).toBeNull();
  });
  it("staff entra a admin; tesista es redirigido a su panel", () => {
    expect(redirigirSiNoPuede("ADMIN_FIPS", "/admin")).toBeNull();
    expect(redirigirSiNoPuede("SECRETARIA", "/inscripciones")).toBeNull();
    expect(redirigirSiNoPuede("TESISTA", "/admin")).toBe("/mi-tramite");
    expect(redirigirSiNoPuede("ASESOR", "/talleres")).toBe("/asesor");
  });
  it("asesor y tesista acceden a sus portales; cruzados redirigen", () => {
    expect(redirigirSiNoPuede("ASESOR", "/asesor")).toBeNull();
    expect(redirigirSiNoPuede("TESISTA", "/mi-tramite")).toBeNull();
    expect(redirigirSiNoPuede("TESISTA", "/asesor")).toBe("/mi-tramite");
    expect(redirigirSiNoPuede("ASESOR", "/mi-tramite")).toBe("/asesor");
  });
  it("detalle exige autenticación pero no filtra por rol (el servidor aplica alcance)", () => {
    expect(redirigirSiNoPuede("TESISTA", "/expedientes/abc")).toBeNull();
    expect(redirigirSiNoPuede("ADMIN_FIPS", "/expedientes/abc")).toBeNull();
  });
  it("esStaff distingue personal de portales", () => {
    expect(esStaff("ADMIN_FIPS")).toBe(true);
    expect(esStaff("TESISTA")).toBe(false);
    expect(esStaff(null)).toBe(false);
  });
});
