import { describe, expect, it } from "vitest";
import { DerivarSubetapaUseCase } from "./derivar-subetapa.use-case.js";

describe("DerivarSubetapaUseCase (validaciones puras, sin DB)", () => {
  it("rechaza un correo de destino inválido", async () => {
    const r = await new DerivarSubetapaUseCase().execute(
      "00000000-0000-0000-0000-000000000000",
      { responsable: "no-es-correo" },
      { id: "a", dni: "00000001" },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});
