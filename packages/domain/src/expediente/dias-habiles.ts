/** Feriados nacionales oficiales Perú (fijos). Año bisiesto cubierto por Date. */
const FERIADOS_FIJOS = [
  "01-01",
  "05-01",
  "06-29",
  "07-28",
  "07-29",
  "08-30",
  "10-08",
  "11-01",
  "12-08",
  "12-25",
];

/** Jueves/Viernes Santo aproximado 2025-2030 (para cálculo local; tabla administrable en prod). */
const FERIADOS_MOVIBLES = new Set([
  "2025-04-17",
  "2025-04-18",
  "2026-04-02",
  "2026-04-03",
  "2027-03-25",
  "2027-03-26",
  "2028-04-13",
  "2028-04-14",
  "2029-03-29",
  "2029-03-30",
  "2030-04-18",
  "2030-04-19",
]);

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function esDiaHabil(fecha: Date, feriadosExtra: ReadonlySet<string> = new Set()): boolean {
  const dia = fecha.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  const key = iso(fecha);
  const mmdd = key.slice(5);
  if (FERIADOS_FIJOS.includes(mmdd)) return false;
  if (FERIADOS_MOVIBLES.has(key)) return false;
  if (feriadosExtra.has(key)) return false;
  return true;
}

/**
 * RN-PLZ-02: el plazo corre desde el día hábil siguiente al envío.
 * Suma N días hábiles a `desde` (excluye `desde`, incluye destino).
 */
export function sumarDiasHabiles(
  desde: Date,
  n: number,
  feriadosExtra?: ReadonlySet<string>,
): Date {
  const d = new Date(desde);
  let restan = n;
  while (restan > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (esDiaHabil(d, feriadosExtra)) restan -= 1;
  }
  return d;
}

/** Días hábiles restantes de `ahora` hasta `vencimiento` (negativo = vencido). */
export function diasHabilesRestantes(
  ahora: Date,
  vencimiento: Date,
  feriadosExtra?: ReadonlySet<string>,
): number {
  if (vencimiento <= ahora) return 0;
  let count = 0;
  const d = new Date(ahora);
  while (true) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d > vencimiento) break;
    if (esDiaHabil(d, feriadosExtra)) count += 1;
  }
  return count;
}

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

/** Semáforo de plazos: ROJO ≤1 día o vencido, AMARILLO ≤3, VERDE resto. */
export function semaforoPlazo(restantes: number): Semaforo {
  if (restantes <= 1) return "ROJO";
  if (restantes <= 3) return "AMARILLO";
  return "VERDE";
}
