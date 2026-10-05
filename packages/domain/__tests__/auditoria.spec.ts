import { describe, expect, it } from "vitest";
import {
  type EventoCadena,
  hashTransicion,
  verificarCadena,
} from "../src/audit/cryptographic-trail.js";

const EXP = "11111111-1111-4111-8111-111111111111";

/** Cadena válida: cada evento enlaza con el anterior. */
function cadena(estados: string[]): EventoCadena[] {
  const eventos: EventoCadena[] = [];
  let previo: string | null = null;
  estados.forEach((estadoNuevo, i) => {
    const timestamp = new Date(Date.UTC(2026, 9, 5, 12, 0, i)).toISOString();
    const hash = hashTransicion({
      hashPrevio: previo,
      expedienteId: EXP,
      actor: "00000001",
      nuevoEstado: estadoNuevo,
      timestamp,
    });
    eventos.push({
      id: `e${i + 1}`,
      expedienteId: EXP,
      actorDni: "00000001",
      estadoNuevo,
      hashPrevio: previo,
      hash,
      timestamp,
    });
    previo = hash;
  });
  return eventos;
}

describe("verificación de la cadena de custodia (RNF-03)", () => {
  it("una cadena íntegra se verifica aunque llegue desordenada", () => {
    const eventos = cadena(["REGISTRADO", "EN_PLAN", "PLAN_APROBADO"]);
    const r = verificarCadena([eventos[2], eventos[0], eventos[1]] as EventoCadena[]);
    expect(r).toEqual({ integra: true, eventos: 3, verificados: 3, eventoId: null, motivo: null });
    expect(verificarCadena([]).integra).toBe(true);
  });

  it("detecta un evento alterado y señala dónde se rompe", () => {
    const eventos = cadena(["REGISTRADO", "EN_PLAN", "PLAN_APROBADO"]);
    const alterada = eventos.map((e) => (e.id === "e2" ? { ...e, estadoNuevo: "ANULADO" } : e));
    const r = verificarCadena(alterada);
    expect(r.integra).toBe(false);
    expect(r.eventoId).toBe("e2");
    expect(r.verificados).toBe(1);
    expect(r.motivo).toContain("alterado");
  });

  it("detecta bifurcaciones, eventos sueltos y eventos sin DNI del actor", () => {
    const eventos = cadena(["REGISTRADO", "EN_PLAN"]);
    const [e1] = eventos as [EventoCadena];
    const rama = { ...e1, id: "rama", hashPrevio: null, hash: "f".repeat(64) };
    expect(verificarCadena([...eventos, rama]).motivo).toContain("bifurca");

    const suelto = { ...e1, id: "suelto", hashPrevio: "a".repeat(64), hash: "b".repeat(64) };
    const r = verificarCadena([...eventos, suelto]);
    expect(r.integra).toBe(false);
    expect(r.eventoId).toBe("suelto");

    const sinDni = eventos.map((e) => ({ ...e, actorDni: null }));
    expect(verificarCadena(sinDni).motivo).toContain("sin DNI");
  });
});
