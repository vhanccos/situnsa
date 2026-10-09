import { describe, expect, it } from "vitest";
import {
  ObservarComprobanteUseCase,
  SubirComprobanteUseCase,
  ValidarComprobanteUseCase,
} from "./comprobantes.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("SubirComprobanteUseCase (P8, sin DB)", () => {
  it("rechaza extensión no permitida", async () => {
    const r = await new SubirComprobanteUseCase().execute(
      {
        cuotaId: "00000000-0000-0000-0000-000000000000",
        usuarioId: "00000000-0000-0000-0000-000000000001",
        filename: "pago.exe",
        bytes: new Uint8Array([1, 2, 3]),
      },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("DOCUMENTO_INVALIDO");
  });
  it("rechaza más de 5MB", async () => {
    const r = await new SubirComprobanteUseCase().execute(
      {
        cuotaId: "00000000-0000-0000-0000-000000000000",
        usuarioId: "00000000-0000-0000-0000-000000000001",
        filename: "pago.pdf",
        bytes: new Uint8Array(6 * 1024 * 1024),
      },
      actor,
    );
    expect(r.ok).toBe(false);
  });
});

describe("Validar/Observar (requieren DB: solo firma)", () => {
  it("exponen execute", () => {
    expect(typeof new ValidarComprobanteUseCase().execute).toBe("function");
    expect(typeof new ObservarComprobanteUseCase().execute).toBe("function");
  });
});
