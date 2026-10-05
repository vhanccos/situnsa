import { describe, expect, it } from "vitest";
import { cargaHabilitadaTesista } from "../src/expediente/checklist-catalogo.js";
import { compararNombre, normalizarNombre } from "../src/expediente/identidad.js";
import { evaluarPlazo, plazoMaximoDiasHabiles } from "../src/expediente/plazos.js";
import { esProgramaOficial } from "../src/expediente/seguimiento-catalogo.js";

describe("plazos del catálogo (RN-PLZ)", () => {
  it.each([
    ["1 a 3 días hábiles", 3],
    ["20 días hábiles", 20],
    ["1 día hábil", 1],
    ["5 a 15 días hábiles", 15],
  ])("«%s» → %i días hábiles", (texto, dias) => {
    expect(plazoMaximoDiasHabiles(texto)).toBe(dias);
  });

  it.each([
    "Variable",
    "Según sesión programada",
    "Incluido en revisión",
    "1 a 2 días hábiles antes de sustentar",
    "Aproximadamente 15 días posteriores a la colación",
    null,
  ])("«%s» no es medible", (texto) => {
    expect(plazoMaximoDiasHabiles(texto)).toBeNull();
  });

  it("vence contando desde el día hábil siguiente y salta el fin de semana", () => {
    const viernes = new Date("2026-09-18T14:00:00Z");
    const p = evaluarPlazo(viernes, "1 a 3 días hábiles", new Date("2026-09-21T15:00:00Z"));
    expect(p?.vencimiento.toISOString().slice(0, 10)).toBe("2026-09-23");
    expect(p?.vencido).toBe(false);
    expect(p?.diasRestantes).toBe(2);
    expect(p?.semaforo).toBe("AMARILLO");
  });

  it("marca ROJO cuando ya venció", () => {
    const p = evaluarPlazo(
      new Date("2026-09-01T14:00:00Z"),
      "1 día hábil",
      new Date("2026-09-10T14:00:00Z"),
    );
    expect(p?.vencido).toBe(true);
    expect(p?.semaforo).toBe("ROJO");
  });
});

describe("identidad nombre–DNI (HU-0019)", () => {
  it("normaliza espacios y mayúsculas conservando tildes", () => {
    expect(normalizarNombre("  maría   pérez ")).toBe("MARÍA PÉREZ");
  });

  it("distingue diferencias solo de tildes", () => {
    const reg = { nombres: "María", apellidos: "Pérez Quispe" };
    expect(compararNombre(reg, { nombres: "MARÍA", apellidos: "pérez quispe" })).toBe("IGUAL");
    expect(compararNombre(reg, { nombres: "Maria", apellidos: "Perez Quispe" })).toBe(
      "DIFIERE_EN_TILDES",
    );
    expect(compararNombre(reg, { nombres: "Rosa", apellidos: "Pérez Quispe" })).toBe("DISTINTO");
  });
});

describe("catálogos", () => {
  it("solo acepta programas oficiales exactos (INC-01)", () => {
    expect(esProgramaOficial("SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS")).toBe(true);
    expect(esProgramaOficial("Seleccione")).toBe(false);
  });

  it("RN-06: el tesista carga lo de su subetapa activa y lo observado", () => {
    const plan = {
      tipo: "PLAN_ESTRUCTURADO",
      requeridoEn: "E1_PRESENTACION_PLAN",
      estado: "PENDIENTE",
    };
    expect(cargaHabilitadaTesista(plan, "E1_PRESENTACION_PLAN")).toBe(true);
    expect(cargaHabilitadaTesista(plan, "E1_DECRETO")).toBe(false);
    expect(cargaHabilitadaTesista({ ...plan, estado: "OBSERVADO" }, "E1_DECRETO")).toBe(true);
    expect(cargaHabilitadaTesista(plan, "E1_LEVANTAMIENTO")).toBe(true);
  });
});
