import { describe, expect, it } from "vitest";
import { hashTransicion } from "../src/audit/cryptographic-trail.js";
import {
  diasHabilesRestantes,
  esDiaHabil,
  semaforoPlazo,
  sumarDiasHabiles,
} from "../src/expediente/dias-habiles.js";
import { assertTransition, canTransition } from "../src/expediente/fsm.js";
import { ExpeditoParaSustentarSpecification } from "../src/expediente/specifications/expedito-para-sustentar.specification.js";
import { fail, map, ok } from "../src/shared/result.js";

describe("Result", () => {
  it("ok/map/fail", () => {
    expect(ok(2).ok).toBe(true);
    expect(map(ok(2), (x) => x * 2)).toEqual(ok(4));
    expect(fail("e").ok).toBe(false);
  });
});

describe("FSM", () => {
  it("permite REGISTRADO → EN_PLAN → PLAN_APROBADO", () => {
    expect(canTransition("REGISTRADO", "EN_PLAN")).toBe(true);
    expect(canTransition("EN_PLAN", "PLAN_APROBADO")).toBe(true);
  });
  it("permite observar inscripción y levantarla (B1)", () => {
    expect(canTransition("REGISTRADO", "OBSERVADO")).toBe(true);
    expect(canTransition("OBSERVADO", "REGISTRADO")).toBe(true);
  });
  it("rechaza saltos ilegales", () => {
    expect(canTransition("REGISTRADO", "TITULO_EMITIDO")).toBe(false);
    expect(assertTransition("REGISTRADO", "TITULO_EMITIDO").ok).toBe(false);
  });
});

describe("días hábiles", () => {
  it("salta fin de semana (vie +1 = lun)", () => {
    const vie = new Date("2026-09-18T00:00:00Z"); // viernes
    expect(sumarDiasHabiles(vie, 1).toISOString().slice(0, 10)).toBe("2026-09-21");
  });
  it("lunes es hábil, domingo no", () => {
    expect(esDiaHabil(new Date("2026-09-21T00:00:00Z"))).toBe(true);
    expect(esDiaHabil(new Date("2026-09-20T00:00:00Z"))).toBe(false);
  });
  it("semáforo", () => {
    expect(semaforoPlazo(0)).toBe("ROJO");
    expect(semaforoPlazo(2)).toBe("AMARILLO");
    expect(semaforoPlazo(10)).toBe("VERDE");
    expect(
      diasHabilesRestantes(new Date("2026-09-18T00:00:00Z"), new Date("2026-09-18T00:00:00Z")),
    ).toBe(0);
  });
});

describe("specification expedito", () => {
  it("exige 3 conformidades y 0 deudas", () => {
    const s = new ExpeditoParaSustentarSpecification();
    expect(
      s.isSatisfiedBy({
        dictamenesConformes: 3,
        deudasBiblioteca: 0,
        pensionesPendientes: 0,
        versionFinalCargada: true,
      }),
    ).toBe(true);
    expect(
      s.isSatisfiedBy({
        dictamenesConformes: 2,
        deudasBiblioteca: 0,
        pensionesPendientes: 0,
        versionFinalCargada: true,
      }),
    ).toBe(false);
  });
});

describe("hash chain", () => {
  it("es determinista y encadena", () => {
    const a = hashTransicion({
      hashPrevio: null,
      expedienteId: "e1",
      actor: "u1",
      nuevoEstado: "EN_PLAN",
      timestamp: "t",
    });
    const b = hashTransicion({
      hashPrevio: a,
      expedienteId: "e1",
      actor: "u1",
      nuevoEstado: "PLAN_APROBADO",
      timestamp: "t2",
    });
    expect(a).toHaveLength(64);
    expect(b).not.toBe(a);
  });
});
