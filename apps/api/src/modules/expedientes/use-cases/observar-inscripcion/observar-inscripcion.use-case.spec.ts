import { describe, expect, it } from "vitest";
import { ObservarInscripcionUseCase } from "./observar-inscripcion.use-case.js";

describe("ObservarInscripcionUseCase (validaciones puras, sin DB)", () => {
  const uc = new ObservarInscripcionUseCase();
  const actor = { id: "a", dni: "00000001" };
  it("rechaza motivo corto sin tocar DB", async () => {
    const r = await uc.execute("00000000-0000-0000-0000-000000000000", "abc", actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
  it("rechaza motivo vacío sin tocar DB", async () => {
    const r = await uc.execute("00000000-0000-0000-0000-000000000000", "   ", actor);
    expect(r.ok).toBe(false);
  });
});
