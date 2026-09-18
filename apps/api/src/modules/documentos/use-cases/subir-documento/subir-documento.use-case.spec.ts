import { describe, expect, it } from "vitest";
import { esPdfReal, SubirDocumentoUseCase } from "./subir-documento.use-case.js";

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);

describe("esPdfReal (magic bytes)", () => {
  it("acepta cabecera %PDF-", () => {
    expect(esPdfReal(PDF)).toBe(true);
  });
  it("rechaza contenido que no es PDF aunque la extensión sí", () => {
    expect(esPdfReal(new Uint8Array([1, 2, 3, 4, 5]))).toBe(false);
    expect(esPdfReal(new Uint8Array(0))).toBe(false);
  });
});

describe("SubirDocumentoUseCase (validaciones puras, sin DB)", () => {
  const uc = new SubirDocumentoUseCase();
  const base = {
    expedienteId: "33333333-3333-4333-8333-333333333333",
    tipo: "SOLICITUD_INSCRIPCION",
    filename: "solicitud.pdf",
    bytes: PDF,
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
  it("rechaza bytes no-PDF con extensión .pdf sin tocar disco", async () => {
    const r = await uc.execute({ ...base, bytes: new Uint8Array([1, 2, 3, 4, 5, 6]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DOCUMENTO_INVALIDO");
  });
});
