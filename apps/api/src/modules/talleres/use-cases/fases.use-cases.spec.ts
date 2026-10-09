import { describe, expect, it } from "vitest";
import {
  CrearFaseUseCase,
  MarcarCumplimientoUseCase,
  RevertirPaseUseCase,
  RevisarEntregaUseCase,
  SolicitarAvanceUseCase,
  SubirEntregaUseCase,
  ValidarPaseUseCase,
} from "./fases.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("CrearFaseUseCase (P6, sin DB)", () => {
  it("rechaza nombre corto sin tocar DB", async () => {
    const r = await new CrearFaseUseCase().execute(
      "00000000-0000-0000-0000-000000000000",
      { nombre: "AB" },
      actor,
    );
    expect(r.ok).toBe(false);
  });
});

describe("MarcarCumplimientoUseCase (P6, sin DB)", () => {
  it("observada exige comentario", async () => {
    const r = await new MarcarCumplimientoUseCase().execute(
      "00000000-0000-0000-0000-000000000000",
      { usuarioDni: "11223344", estado: "OBSERVADA" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("RevertirPaseUseCase (P6, sin DB)", () => {
  it("rechaza sin ser admin", async () => {
    const r = await new RevertirPaseUseCase().execute(
      "00000000-0000-0000-0000-000000000000",
      { usuarioDni: "11223344", motivo: "motivo largo válido" },
      actor,
      false,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PERMISO_DENEGADO");
  });
});

describe("Avances y pases (requieren DB: solo firma)", () => {
  it("exponen execute", () => {
    expect(typeof new SolicitarAvanceUseCase().execute).toBe("function");
    expect(typeof new SubirEntregaUseCase().execute).toBe("function");
    expect(typeof new RevisarEntregaUseCase().execute).toBe("function");
    expect(typeof new ValidarPaseUseCase().execute).toBe("function");
  });
});
