/**
 * Elegibilidad del pase a Plan de tesis P6 (decisión del equipo §Q3):
 * Visto Bueno del asesor + fases completas. Asistencia y pagos son
 * informativos en v1 (sin umbrales del cliente) y salen como avisos.
 */
export interface CondicionPase {
  fasesCompletas: boolean;
  validacionAsesor: boolean;
  asistenciaPct: number | null;
  cuotasAlDia: boolean | null;
}

export interface EvaluacionPase {
  elegible: boolean;
  /** Bloquean el botón (lenguaje simple, RNF-04). */
  faltantes: string[];
  /** Informativos: no bloquean. */
  avisos: string[];
}

export function evaluarPase(c: CondicionPase): EvaluacionPase {
  const faltantes: string[] = [];
  if (!c.fasesCompletas) faltantes.push("Completa todas las fases del taller");
  if (!c.validacionAsesor) faltantes.push("Falta la validación de tu asesor");
  const avisos: string[] = [];
  if (c.asistenciaPct !== null) avisos.push(`Tu asistencia es ${c.asistenciaPct} %`);
  if (c.cuotasAlDia === false) avisos.push("Tienes cuotas pendientes de pago");
  return { elegible: faltantes.length === 0, faltantes, avisos };
}
