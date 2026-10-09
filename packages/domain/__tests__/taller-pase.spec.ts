import { describe, expect, it } from "vitest";
import { evaluarPase } from "../src/taller/pase.js";

describe("evaluarPase (P6)", () => {
  it("elegible con fases + validación del asesor", () => {
    const e = evaluarPase({
      fasesCompletas: true,
      validacionAsesor: true,
      asistenciaPct: 80,
      cuotasAlDia: true,
    });
    expect(e.elegible).toBe(true);
    expect(e.faltantes).toEqual([]);
  });
  it("lista qué falta en lenguaje simple", () => {
    const e = evaluarPase({
      fasesCompletas: false,
      validacionAsesor: false,
      asistenciaPct: 58,
      cuotasAlDia: false,
    });
    expect(e.elegible).toBe(false);
    expect(e.faltantes).toHaveLength(2);
    expect(e.avisos).toHaveLength(2);
  });
});
