import { describe, expect, it } from "vitest";
import {
  CASILLEROS_CONSEJO,
  construirListadoConsejo,
  MARCA_CASILLERO,
  type TitulandoConsejo,
} from "../src/reportes/consejo-facultad.js";

const base: Omit<TitulandoConsejo, "codigo" | "programa" | "participantes"> = {
  modalidad: "TESIS",
  titulo: "  sistema de seguimiento ",
  fechaSustentacion: "2026-11-20",
};

describe("listado consolidado para el Consejo de Facultad (HU-0046)", () => {
  const listado = construirListadoConsejo([
    {
      ...base,
      codigo: "SET020",
      programa: "Segunda Especialidad en Ingeniería de Sistemas",
      participantes: [{ nombres: "María", apellidos: "Zapata Ríos", dni: "70000001" }],
    },
    {
      ...base,
      codigo: "SET021",
      programa: "Segunda Especialidad en Ingeniería Ambiental",
      participantes: [
        { nombres: "Luis", apellidos: "Quispe Mamani", dni: "70000002" },
        { nombres: "Ana", apellidos: "Ávila Cruz", dni: "70000003" },
      ],
    },
  ]);

  it("una fila por titulando, ordenadas por especialidad y apellidos, numeradas", () => {
    expect(listado.filas.map((f) => f[3])).toEqual(["70000003", "70000002", "70000001"]);
    expect(listado.filas.map((f) => f[0])).toEqual([1, 2, 3]);
    expect(listado.filas[0]?.[2]).toBe("ÁVILA CRUZ, ANA");
    expect(listado.filas[0]?.[6]).toBe("SET021");
  });

  it("casilleros XXX para 2 docentes y 3 alumnos de la Comisión Académica (RN-07.1)", () => {
    expect(listado.encabezados.slice(-5)).toEqual([...CASILLEROS_CONSEJO]);
    for (const fila of listado.filas) {
      expect(fila.length).toBe(listado.encabezados.length);
      expect(fila.slice(-5)).toEqual(Array(5).fill(MARCA_CASILLERO));
    }
  });

  it("especialidad en mayúsculas y título como lo escribió el autor (RN-L07)", () => {
    expect(listado.filas[2]?.[1]).toBe("SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS");
    expect(listado.filas[2]?.[5]).toBe("sistema de seguimiento");
    expect(listado.filas[2]?.[4]).toBe("TESIS");
  });
});
