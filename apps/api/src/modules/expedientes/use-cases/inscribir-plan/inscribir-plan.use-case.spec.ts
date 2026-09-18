import { describe, expect, it } from "vitest";
import { InscribirPlanUseCase } from "./inscribir-plan.use-case.js";

describe("InscribirPlanUseCase", () => {
  it("crea expediente sintético válido", async () => {
    const uc = new InscribirPlanUseCase();
    const r = await uc.execute({
      modalidad: "TESIS",
      programa: "Ingeniería de Sistemas",
      titulo: "Sistema de titulación FIPS con trazabilidad criptográfica",
      participante1Dni: "12345678",
      asesorDni: "87654321",
    });
    expect(r.ok).toBe(true);
  });
});
