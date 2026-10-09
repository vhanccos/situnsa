/** Estados de sesión P4 (RF-0202 a RF-0205). */
export type EstadoSesionTaller = "PROGRAMADA" | "ABIERTA" | "REALIZADA" | "CANCELADA";

/** Estados de asistencia por alumno. */
export type EstadoAsistencia = "PENDIENTE" | "PRESENTE" | "FALTA" | "JUSTIFICADA";

/** Umbral informativo de "asistencia baja" P5 (sin evidencia en fuentes: solo alerta). */
export const UMBRAL_ASISTENCIA_BAJA = 70;

/** Solo puede haber una sesión con asistencia abierta por taller a la vez. */
export function puedeAbrirAsistencia(abiertas: number): boolean {
  return abiertas === 0;
}

/** Al cerrar: los pendientes pasan a FALTA; el resto se conserva. */
export function marcasAlCerrar(marcas: EstadoAsistencia[]): EstadoAsistencia[] {
  return marcas.map((m) => (m === "PENDIENTE" ? "FALTA" : m));
}

export interface RegistroAsistencia {
  sesion: EstadoSesionTaller;
  marca: EstadoAsistencia | null;
}

/**
 * Porcentaje 0–100 (entero): PRESENTE + JUSTIFICADA sobre sesiones
 * REALIZADAS. Las CANCELADAS no cuentan y las PROGRAMADAS/ABIERTAS aún
 * no cierran. Sin sesiones realizadas → 0.
 */
export function porcentajeAsistencia(registros: RegistroAsistencia[]): number {
  const computables = registros.filter((r) => r.sesion === "REALIZADA");
  if (computables.length === 0) return 0;
  const asistidas = computables.filter(
    (r) => r.marca === "PRESENTE" || r.marca === "JUSTIFICADA",
  ).length;
  return Math.round((asistidas / computables.length) * 100);
}
