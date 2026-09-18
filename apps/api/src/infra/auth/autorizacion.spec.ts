import { describe, expect, it } from "vitest";
import { decideAlcance } from "./autorizacion.js";

const exp = { id: "e1", estado: "EN_PLAN", asesorId: "a1", dni1: "12345678", dni2: null };

describe("decideAlcance", () => {
  it("staff entra a todo", () => {
    for (const rol of [
      "ADMIN_SISTEMA",
      "RESP_TITULACION",
      "RESP_AREA",
      "VALIDADOR_TALLER",
      "RESP_TALLER",
      "AUTORIDAD",
    ]) {
      expect(decideAlcance([rol], "00000000", "x", exp)).toBe(true);
    }
  });

  it("asesor solo a sus asignados (RN-07)", () => {
    expect(decideAlcance(["ASESOR"], "87654321", "a1", exp)).toBe(true);
    expect(decideAlcance(["ASESOR"], "00000000", "otro", exp)).toBe(false);
  });

  it("tesista solo a su expediente (RN-06)", () => {
    expect(decideAlcance(["TESISTA"], "12345678", "t1", exp)).toBe(true);
    expect(decideAlcance(["TESISTA"], "99999999", "t9", exp)).toBe(false);
  });

  it("invitado y sin roles no entran", () => {
    expect(decideAlcance(["INVITADO"], "12345678", "t1", exp)).toBe(false);
    expect(decideAlcance([], "12345678", "t1", exp)).toBe(false);
  });
});
