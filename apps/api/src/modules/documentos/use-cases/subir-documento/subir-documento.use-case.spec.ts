import { describe, expect, it } from "vitest";
import { SubirDocumentoUseCase } from "./subir-documento.use-case.js";

describe("SubirDocumentoUseCase (validaciones puras, sin DB)", () => {
  const uc = new SubirDocumentoUseCase();
  const base = {
    expedienteId: "33333333-3333-4333-8333-333333333333",
    tipo: "SOLICITUD_INSCRIPCION",
    filename: "solicitud.pdf",
    bytes: new Uint8Array([1, 2, 3]),
    actor: { id: "a", dni: "12345678" },
  };
  it("rechaza tipo desconocido sin tocar disco", async () => {
    const r = await uc.execute({ ...base, tipo: "INEXISTENTE" });
    expect(r.ok).toBe(false);
  });
  it("rechaza no-PDF sin tocar disco", async () => {
    const r = await uc.execute({ ...base, filename: "foto.jpg" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DOCUMENTO_INVALIDO");
  });
  it("rechaza archivo vacío sin tocar disco", async () => {
    const r = await uc.execute({ ...base, bytes: new Uint8Array(0) });
    expect(r.ok).toBe(false);
  });
});
