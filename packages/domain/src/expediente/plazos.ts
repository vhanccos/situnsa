/**
 * Plazos de subetapa (calendar-rules.md RN-PLZ-01/02/07/08, HU-0055).
 * El catálogo expresa plazos como texto ("1 a 3 días hábiles"); aquí se
 * obtiene el máximo en días hábiles y el vencimiento/semáforo. Puro.
 */

import {
  diasHabilesRestantes,
  type Semaforo,
  semaforoPlazo,
  sumarDiasHabiles,
} from "./dias-habiles.js";

/**
 * Máximo de días hábiles de un plazo textual del catálogo, o `null` si el
 * plazo no se mide en días hábiles desde el inicio ("Variable", "Según
 * sesión", "…antes de sustentar", "…posteriores a la colación").
 */
export function plazoMaximoDiasHabiles(plazo: string | null | undefined): number | null {
  if (!plazo) return null;
  const texto = plazo.toLowerCase();
  if (/antes|posterior|según|segun|variable|incluido|programada/.test(texto)) return null;
  const m = /(\d+)(?:\s*a\s*(\d+))?\s*d[ií]as?\s+h[aá]bil(?:es)?/.exec(texto);
  if (!m?.[1]) return null;
  const maximo = Number.parseInt(m[2] ?? m[1], 10);
  return Number.isFinite(maximo) && maximo > 0 ? maximo : null;
}

export interface EstadoPlazo {
  readonly vencimiento: Date;
  /** Días hábiles que quedan (0 si ya venció). */
  readonly diasRestantes: number;
  readonly vencido: boolean;
  readonly semaforo: Semaforo;
}

/**
 * Vencimiento de una subetapa iniciada en `inicio` (RN-PLZ-02: el conteo
 * empieza el día hábil siguiente). `null` si el plazo no es medible.
 */
export function evaluarPlazo(
  inicio: Date,
  plazo: string | null | undefined,
  ahora: Date,
  feriadosExtra?: ReadonlySet<string>,
): EstadoPlazo | null {
  const dias = plazoMaximoDiasHabiles(plazo);
  if (dias === null) return null;
  const vencimiento = sumarDiasHabiles(inicio, dias, feriadosExtra);
  // Se vence al terminar el día del vencimiento (fin de jornada UTC).
  const finDelDia = new Date(vencimiento);
  finDelDia.setUTCHours(23, 59, 59, 999);
  const vencido = ahora.getTime() > finDelDia.getTime();
  const diasRestantes = vencido ? 0 : diasHabilesRestantes(ahora, finDelDia, feriadosExtra);
  return {
    vencimiento,
    diasRestantes,
    vencido,
    semaforo: vencido ? "ROJO" : semaforoPlazo(diasRestantes),
  };
}
