import { describe, expect, it } from "vitest";
import { DictaminarUseCase, ProgramarSustentacionUseCase } from "./cierre.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("DictaminarUseCase (validaciones puras, sin DB)", () => {
  it("observar sin comentario se rechaza sin tocar DB", async () => {
    const r = await new DictaminarUseCase().execute("e", "v", { dictamen: "OBSERVADO" }, actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("ProgramarSustentacionUseCase (validaciones puras, sin DB)", () => {
  it("rechaza lugar corto sin tocar DB", async () => {
    const r = await new ProgramarSustentacionUseCase().execute(
      "e",
      { fecha: "2026-10-01", hora: "10:00", lugar: "AB", modalidad: "PRESENCIAL" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});
