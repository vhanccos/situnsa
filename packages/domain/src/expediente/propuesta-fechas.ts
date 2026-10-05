/**
 * Propuesta de fechas de sustentación (HU-0038, RN-05.1): el alumno propone
 * un RANGO, nunca una fecha única, y el rango debe dejar margen para la
 * citación oficial con la anticipación mínima (RN-PLZ-04). Puro: `hoy` se
 * inyecta como fecha civil AAAA-MM-DD (America/Lima).
 */

import { DomainError } from "../shared/domain-error.base.js";
import { fail, ok, type Result } from "../shared/result.js";
import { DIAS_MINIMOS_PUBLICACION } from "./reglas-avance.js";

export interface RangoFechas {
  readonly desde: string;
  readonly hasta: string;
}

/** AAAA-MM-DD de calendario real (rechaza 2026-02-30). */
export function esFechaCivil(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function validarRangoPropuesto(
  rango: RangoFechas,
  hoy: string,
): Result<RangoFechas, DomainError> {
  if (!esFechaCivil(rango.desde) || !esFechaCivil(rango.hasta)) {
    return fail(new DomainError("VALIDACION_FALLIDA", "Fechas inválidas (AAAA-MM-DD)"));
  }
  if (rango.desde <= hoy) {
    return fail(new DomainError("VALIDACION_FALLIDA", "El rango debe empezar en una fecha futura"));
  }
  if (rango.hasta <= rango.desde) {
    return fail(
      new DomainError(
        "VALIDACION_FALLIDA",
        "Propón un rango de fechas (al menos dos días), no una fecha única",
      ),
    );
  }
  const minima = sumarDias(hoy, DIAS_MINIMOS_PUBLICACION);
  if (rango.hasta < minima) {
    return fail(
      new DomainError(
        "PLAZO_VENCIDO",
        `La citación oficial exige ${DIAS_MINIMOS_PUBLICACION} días de anticipación: el rango debe llegar al menos al ${minima}`,
      ),
    );
  }
  return ok(rango);
}

export function fechaEnRango(fecha: string, rango: RangoFechas): boolean {
  return fecha >= rango.desde && fecha <= rango.hasta;
}
