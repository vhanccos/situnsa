import { describe, expect, it } from "vitest";
import {
  DictaminarUseCase,
  instanciaPorEstado,
  ProgramarSustentacionUseCase,
  ProponerFechasSustentacionUseCase,
  RegistrarValidacionUseCase,
  validarComposicion,
} from "./cierre.use-cases.js";

const actor = { id: "a", dni: "00000001" };

describe("DictaminarUseCase (validaciones puras, sin DB)", () => {
  it("observar sin comentario se rechaza sin tocar DB", async () => {
    const r = await new DictaminarUseCase().execute("e", "v", { dictamen: "OBSERVADO" }, actor);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
});

describe("ProgramarSustentacionUseCase (validaciones puras, sin DB)", () => {
  const uc = new ProgramarSustentacionUseCase();
  const ahora = new Date("2026-10-05T15:00:00Z");
  it("rechaza lugar corto sin tocar DB", async () => {
    const r = await uc.execute(
      "e",
      { fecha: "2026-11-01", hora: "10:00", lugar: "AB", modalidad: "PRESENCIAL" },
      actor,
      ahora,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("VALIDACION_FALLIDA");
  });
  it("rechaza una fecha pasada o de hoy", async () => {
    const r = await uc.execute(
      "e",
      { fecha: "2026-10-05", hora: "10:00", lugar: "AUDITORIO FIPS", modalidad: "PRESENCIAL" },
      actor,
      ahora,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("futura");
  });
  it("rechaza una hora mal formada", async () => {
    const r = await uc.execute(
      "e",
      { fecha: "2026-11-01", hora: "25:00", lugar: "AUDITORIO FIPS", modalidad: "PRESENCIAL" },
      actor,
      ahora,
    );
    expect(r.ok).toBe(false);
  });
});

describe("ProponerFechasSustentacionUseCase (validaciones puras, sin DB)", () => {
  const uc = new ProponerFechasSustentacionUseCase();
  const ahora = new Date("2026-10-05T15:00:00Z");
  it("exige un rango: una fecha única se rechaza (RN-05.1)", async () => {
    const r = await uc.execute("e", { desde: "2026-10-20", hasta: "2026-10-20" }, actor, ahora);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("no una fecha única");
  });
  it("el rango debe permitir la citación con 7 días de anticipación", async () => {
    const r = await uc.execute("e", { desde: "2026-10-06", hasta: "2026-10-09" }, actor, ahora);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("PLAZO_VENCIDO");
  });
});

describe("RegistrarValidacionUseCase (validaciones puras, sin DB)", () => {
  it("OTI_SIMILITUD exige el porcentaje (HU-0041)", async () => {
    const r = await new RegistrarValidacionUseCase().execute(
      "e",
      { instancia: "OTI_SIMILITUD", estado: "APROBADO" },
      actor,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain("porcentaje");
  });
});

describe("reglas de designación (puras)", () => {
  it("E1 designa terna; E2–E4 jurado; otros estados nada", () => {
    expect(instanciaPorEstado("EN_PLAN")).toBe("TERNA");
    expect(instanciaPorEstado("EN_BORRADOR")).toBe("JURADO");
    expect(instanciaPorEstado("APTO_SUSTENTACION")).toBe("JURADO");
    expect(instanciaPorEstado("TITULO_EMITIDO")).toBeNull();
  });

  it("roles únicos, 3 titulares y 1 suplente", () => {
    expect(validarComposicion([{ rol: "PRESIDENTE" }], "PRESIDENTE")).toContain("presidente");
    const tres = [{ rol: "PRESIDENTE" }, { rol: "SECRETARIO" }, { rol: "VOCAL" }];
    expect(validarComposicion(tres, "VOCAL")).toContain("3 miembros");
    expect(validarComposicion(tres, "SUPLENTE")).toBeNull();
    expect(validarComposicion([...tres, { rol: "SUPLENTE" }], "SUPLENTE")).not.toBeNull();
  });
});
