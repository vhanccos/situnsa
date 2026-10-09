import { describe, expect, it } from "vitest";
import { generarSesiones, validarProgramacion } from "../src/taller/sesiones.js";

describe("validarProgramacion (P2)", () => {
  const base = {
    dias: [6, 7],
    horaInicio: "09:00",
    horaFin: "11:00",
    total: 12,
    cupoMax: 30,
  };
  it("acepta una programación válida", () => {
    expect(validarProgramacion(base).ok).toBe(true);
  });
  it("rechaza sin días marcados", () => {
    const r = validarProgramacion({ ...base, dias: [] });
    expect(r.ok).toBe(false);
  });
  it("rechaza fin anterior al inicio", () => {
    const r = validarProgramacion({ ...base, horaInicio: "11:00", horaFin: "09:00" });
    expect(r.ok).toBe(false);
  });
  it("rechaza enlace sin https", () => {
    const r = validarProgramacion({ ...base, enlace: "http://meet.local/x" });
    expect(r.ok).toBe(false);
  });
  it("acepta sin enlace (opcional)", () => {
    expect(validarProgramacion(base).ok).toBe(true);
  });
});

describe("generarSesiones (P2)", () => {
  it("genera 12 sesiones sáb+dom desde el 17/10/2026", () => {
    const r = generarSesiones({
      fechaInicio: "2026-10-17",
      dias: [6, 7],
      horaInicio: "09:00",
      horaFin: "11:00",
      total: 12,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(12);
    expect(r.value[0]).toMatchObject({ nro: 1, fecha: "2026-10-17" });
    expect(r.value[11]).toMatchObject({ nro: 12, fecha: "2026-11-22" });
  });
  it("rechaza fecha imposible", () => {
    expect(
      generarSesiones({
        fechaInicio: "2026-13-40",
        dias: [6],
        horaInicio: "09:00",
        horaFin: "11:00",
        total: 4,
      }).ok,
    ).toBe(false);
  });
});
