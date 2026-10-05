import { describe, expect, it } from "vitest";
import { destinoLevantamiento } from "./levantar-observacion.use-case.js";

describe("destinoLevantamiento (sin DB)", () => {
  it("vuelve al estado guardado al observar", () => {
    expect(destinoLevantamiento("EN_DICTAMEN", true)).toBe("EN_DICTAMEN");
    expect(destinoLevantamiento("EN_BORRADOR", true)).toBe("EN_BORRADOR");
  });

  it("sin marca de origen: REGISTRADO si no hay seguimiento, EN_PLAN si lo hay", () => {
    expect(destinoLevantamiento(null, false)).toBe("REGISTRADO");
    expect(destinoLevantamiento(null, true)).toBe("EN_PLAN");
  });
});
