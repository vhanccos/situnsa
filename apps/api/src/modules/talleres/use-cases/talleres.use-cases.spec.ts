import { describe, expect, it } from "vitest";
import {
  CambiarAsesorUseCase,
  CancelarTallerUseCase,
  CrearTallerUseCase,
  EditarTallerUseCase,
} from "./talleres.use-cases.js";

const actor = { id: "a", dni: "00000001" };
const base = {
  nombre: "TALLER 06",
  fechaInicio: "2026-10-17",
  diasSesion: [6, 7],
  horaInicio: "09:00",
  horaFin: "11:00",
  totalSesiones: 12,
  cupoMax: 30,
};

describe("CrearTallerUseCase (P2, sin DB)", () => {
  it("rechaza sin días sin tocar DB", async () => {
    const r = await new CrearTallerUseCase().execute({ ...base, diasSesion: [] }, actor);
    expect(r.ok).toBe(false);
  });
  it("rechaza fin anterior al inicio sin tocar DB", async () => {
    const r = await new CrearTallerUseCase().execute(
      { ...base, horaInicio: "11:00", horaFin: "09:00" },
      actor,
    );
    expect(r.ok).toBe(false);
  });
  it("rechaza enlace sin https sin tocar DB", async () => {
    const r = await new CrearTallerUseCase().execute({ ...base, enlace: "http://x.local" }, actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("Editar/Cambiar/Cancelar (requieren DB: solo firma)", () => {
  it("exponen execute", () => {
    expect(typeof new EditarTallerUseCase().execute).toBe("function");
    expect(typeof new CambiarAsesorUseCase().execute).toBe("function");
    expect(typeof new CancelarTallerUseCase().execute).toBe("function");
  });
});
