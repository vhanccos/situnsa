import { describe, expect, it } from "vitest";
import {
  AgregarMiembroUseCase,
  CrearGrupoUseCase,
  ProgramarPensionesUseCase,
  RegistrarPagoUseCase,
} from "./grupos-pagos.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("CrearGrupoUseCase (validaciones puras, sin DB)", () => {
  it("rechaza nombre corto sin tocar DB", async () => {
    const r = await new CrearGrupoUseCase().execute(
      { tallerId: "00000000-0000-0000-0000-000000000000", nombre: "AB" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("AgregarMiembroUseCase (requiere DB: solo firma)", () => {
  it("expone execute", () => {
    expect(typeof new AgregarMiembroUseCase().execute).toBe("function");
  });
});

describe("ProgramarPensionesUseCase (requiere DB: solo firma)", () => {
  it("expone execute", () => {
    expect(typeof new ProgramarPensionesUseCase().execute).toBe("function");
  });
});

describe("RegistrarPagoUseCase (validaciones puras, sin DB)", () => {
  it("rechaza monto no positivo sin tocar DB", async () => {
    const r = await new RegistrarPagoUseCase().execute(
      { cronogramaId: "00000000-0000-0000-0000-000000000000", monto: 0, medio: "CAJA" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});
