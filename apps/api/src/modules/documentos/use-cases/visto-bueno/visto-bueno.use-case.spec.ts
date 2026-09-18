import { describe, expect, it } from "vitest";
import { VistoBuenoDocumentoUseCase } from "./visto-bueno.use-case.js";

describe("VistoBuenoDocumentoUseCase (validaciones puras, sin DB)", () => {
  const uc = new VistoBuenoDocumentoUseCase();
  const actor = { id: "a", dni: "87654321" };
  it("observar sin comentario se rechaza sin tocar DB", async () => {
    const r = await uc.execute("00000000-0000-0000-0000-000000000000", { aprobado: false }, actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
  it("observar con comentario en blanco se rechaza sin tocar DB", async () => {
    const r = await uc.execute(
      "00000000-0000-0000-0000-000000000000",
      { aprobado: false, comentario: "  " },
      actor,
    );
    expect(r.ok).toBe(false);
  });
});
