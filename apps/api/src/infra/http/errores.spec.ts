import { describe, expect, it } from "vitest";
import { errorEnvelope, mensajeDeError, nuevaCorrelacion } from "./errores.js";

describe("errores API v1", () => {
  it("genera correlación uuid única por error", () => {
    expect(nuevaCorrelacion()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(nuevaCorrelacion()).not.toBe(nuevaCorrelacion());
  });

  it("construye el envelope con código + mensaje + correlación", () => {
    const e = errorEnvelope("RN_09_SUBETAPAS_PENDIENTES", "No es posible avanzar");
    expect(e.error.codigo).toBe("RN_09_SUBETAPAS_PENDIENTES");
    expect(e.error.mensaje).toBe("No es posible avanzar");
    expect(e.error.correlacion).toMatch(/^[0-9a-f-]{36}$/);
    expect(e.error.detalles).toBeUndefined();
  });

  it("incluye detalles cuando se aportan", () => {
    const e = errorEnvelope("X", "Y", [{ subetapa: "Plan", estado: "OBSERVADA" }]);
    expect(e.error.detalles).toEqual([{ subetapa: "Plan", estado: "OBSERVADA" }]);
  });

  it("mensajeDeError entiende envelope nuevo y legacy", () => {
    expect(mensajeDeError(errorEnvelope("C", "Hola"))).toBe("Hola");
    expect(mensajeDeError({ message: "Viejo" })).toBe("Viejo");
    expect(mensajeDeError(null)).toBe("Error inesperado");
    expect(mensajeDeError({})).toBe("Error inesperado");
  });
});
