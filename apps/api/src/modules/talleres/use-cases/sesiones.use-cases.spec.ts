import { describe, expect, it } from "vitest";
import {
  AbrirAsistenciaUseCase,
  AsignarAlumnoUseCase,
  CancelarSesionUseCase,
  CerrarAsistenciaUseCase,
  CorregirAsistenciaUseCase,
  MarcarAsistenciaUseCase,
  ReprogramarSesionUseCase,
} from "./sesiones.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("ReprogramarSesionUseCase (P4, sin DB)", () => {
  it("rechaza fin anterior al inicio sin tocar DB", async () => {
    const r = await new ReprogramarSesionUseCase().execute(
      "00000000-0000-0000-0000-000000000000",
      { fecha: "2026-10-24", horaInicio: "11:00", horaFin: "09:00", motivo: "motivo largo" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("Sesiones y asistencia (requieren DB: solo firma)", () => {
  it("exponen execute", () => {
    expect(typeof new AbrirAsistenciaUseCase().execute).toBe("function");
    expect(typeof new CerrarAsistenciaUseCase().execute).toBe("function");
    expect(typeof new CancelarSesionUseCase().execute).toBe("function");
    expect(typeof new MarcarAsistenciaUseCase().execute).toBe("function");
    expect(typeof new CorregirAsistenciaUseCase().execute).toBe("function");
    expect(typeof new AsignarAlumnoUseCase().execute).toBe("function");
  });
});
