import { describe, expect, it } from "vitest";
import {
  marcasAlCerrar,
  porcentajeAsistencia,
  puedeAbrirAsistencia,
} from "../src/taller/asistencia.js";

describe("asistencia del taller (P4)", () => {
  it("solo una abierta por taller", () => {
    expect(puedeAbrirAsistencia(0)).toBe(true);
    expect(puedeAbrirAsistencia(1)).toBe(false);
  });
  it("al cerrar, pendientes pasan a falta y el resto se conserva", () => {
    expect(marcasAlCerrar(["PRESENTE", "PENDIENTE", "FALTA", "JUSTIFICADA"])).toEqual([
      "PRESENTE",
      "FALTA",
      "FALTA",
      "JUSTIFICADA",
    ]);
  });
  it("porcentaje: presente+justificada sobre realizadas; canceladas no cuentan", () => {
    expect(
      porcentajeAsistencia([
        { sesion: "REALIZADA", marca: "PRESENTE" },
        { sesion: "REALIZADA", marca: "JUSTIFICADA" },
        { sesion: "REALIZADA", marca: "FALTA" },
        { sesion: "CANCELADA", marca: null },
        { sesion: "PROGRAMADA", marca: null },
      ]),
    ).toBe(67);
  });
  it("sin realizadas → 0", () => {
    expect(porcentajeAsistencia([{ sesion: "PROGRAMADA", marca: null }])).toBe(0);
  });
});
