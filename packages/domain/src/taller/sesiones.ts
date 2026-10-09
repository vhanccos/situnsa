import { DomainError } from "../shared/domain-error.base.js";
import { fail, ok, type Result } from "../shared/result.js";

/** Días ISO 1 (lunes) … 7 (domingo). */
export const DIAS_VALIDOS = [1, 2, 3, 4, 5, 6, 7] as const;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Tope anti-abuso (RNF-02): nadie programa más de un año de sesiones semanales. */
const MAX_SESIONES = 52;

export interface GenerarSesionesInput {
  fechaInicio: string;
  /** Días ISO de sesión. */
  dias: number[];
  horaInicio: string;
  horaFin: string;
  /** Número de sesiones a generar. */
  total: number;
}

export interface SesionGenerada {
  nro: number;
  /** Fecha civil Perú (YYYY-MM-DD). */
  fecha: string;
  horaInicio: string;
  horaFin: string;
}

function fechaValida(s: string): boolean {
  if (!FECHA_RE.test(s)) return false;
  const partes = s.split("-").map(Number);
  const a = partes[0];
  const m = partes[1];
  const d = partes[2];
  if (a === undefined || m === undefined || d === undefined) return false;
  const dt = new Date(Date.UTC(a, m - 1, d));
  return dt.getUTCFullYear() === a && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Reglas P2 (puras, sin DB): días marcados, fin posterior al inicio,
 * cantidades ≥ 1 y enlace https. El nombre único se verifica en el use-case.
 */
export function validarProgramacion(input: {
  dias: number[];
  horaInicio: string;
  horaFin: string;
  total: number;
  cupoMax?: number;
  enlace?: string | null;
}): Result<true, DomainError> {
  if (input.dias.length === 0)
    return fail(new DomainError("VALIDACION_FALLIDA", "Marca al menos un día de sesión"));
  if (input.dias.some((x) => !Number.isInteger(x) || x < 1 || x > 7))
    return fail(
      new DomainError("VALIDACION_FALLIDA", "Día de sesión inválido (1 = lunes, 7 = domingo)"),
    );
  if (!HORA_RE.test(input.horaInicio) || !HORA_RE.test(input.horaFin))
    return fail(new DomainError("VALIDACION_FALLIDA", "Hora inválida (usa HH:MM de 24 horas)"));
  if (input.horaFin <= input.horaInicio)
    return fail(
      new DomainError("VALIDACION_FALLIDA", "La hora de fin debe ser posterior a la de inicio"),
    );
  if (!Number.isInteger(input.total) || input.total < 1)
    return fail(new DomainError("VALIDACION_FALLIDA", "El número de sesiones debe ser al menos 1"));
  if (input.total > MAX_SESIONES)
    return fail(
      new DomainError(
        "VALIDACION_FALLIDA",
        `El número de sesiones no puede pasar de ${MAX_SESIONES}`,
      ),
    );
  if (input.cupoMax !== undefined && (!Number.isInteger(input.cupoMax) || input.cupoMax < 1))
    return fail(new DomainError("VALIDACION_FALLIDA", "El cupo máximo debe ser al menos 1"));
  if (input.enlace !== undefined && input.enlace !== null && input.enlace !== "") {
    if (!input.enlace.startsWith("https://"))
      return fail(
        new DomainError("VALIDACION_FALLIDA", "El enlace de reunión debe empezar con https://"),
      );
  }
  return ok(true);
}

/**
 * Genera las N sesiones desde la fecha de inicio, avanzando día por día y
 * tomando solo los días marcados. Puro y determinista (testeable sin DB).
 */
export function generarSesiones(
  input: GenerarSesionesInput,
): Result<SesionGenerada[], DomainError> {
  if (!fechaValida(input.fechaInicio))
    return fail(new DomainError("VALIDACION_FALLIDA", "Fecha de inicio inválida (usa AAAA-MM-DD)"));
  const gate = validarProgramacion({
    dias: input.dias,
    horaInicio: input.horaInicio,
    horaFin: input.horaFin,
    total: input.total,
  });
  if (!gate.ok) return gate as Result<SesionGenerada[], DomainError>;
  const marcados = new Set(input.dias);
  const partes = input.fechaInicio.split("-").map(Number);
  const a = partes[0];
  const m = partes[1];
  const d = partes[2];
  if (a === undefined || m === undefined || d === undefined)
    return fail(new DomainError("VALIDACION_FALLIDA", "Fecha de inicio inválida (usa AAAA-MM-DD)"));
  const cursor = new Date(Date.UTC(a, m - 1, d));
  const out: SesionGenerada[] = [];
  while (out.length < input.total) {
    const iso = ((cursor.getUTCDay() + 6) % 7) + 1;
    if (marcados.has(iso)) {
      out.push({
        nro: out.length + 1,
        fecha: cursor.toISOString().slice(0, 10),
        horaInicio: input.horaInicio,
        horaFin: input.horaFin,
      });
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return ok(out);
}
