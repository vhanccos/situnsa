import { describe, expect, it } from "vitest";
import { InscribirPlanUseCase } from "./inscribir-plan.use-case.js";

const base = {
  modalidad: "TESIS" as const,
  programa: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS",
  titulo: "Sistema de titulación FIPS con trazabilidad criptográfica",
  participante1: {
    nombres: "Tesista",
    apellidos: "Prueba",
    dni: "12345678",
    email: "tesista.prueba@unsa.edu.pe",
  },
};

describe("InscribirPlanUseCase (validaciones puras, sin DB)", () => {
  const uc = new InscribirPlanUseCase();

  it("rechaza un programa fuera del catálogo oficial (INC-01)", async () => {
    const r = await uc.execute({ ...base, programa: "Seleccione" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("VALIDACION_FALLIDA");
      expect(r.error.message).toContain("13 programas oficiales");
    }
  });

  it("rechaza dos participantes con el mismo DNI", async () => {
    const r = await uc.execute({
      ...base,
      participante2: { ...base.participante1, email: "otro@unsa.edu.pe" },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("mismo DNI");
  });

  it("rechaza dos participantes con el mismo correo", async () => {
    const r = await uc.execute({
      ...base,
      participante2: {
        ...base.participante1,
        dni: "87654320",
        email: "TESISTA.prueba@unsa.edu.pe",
      },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("propio correo");
  });
});
