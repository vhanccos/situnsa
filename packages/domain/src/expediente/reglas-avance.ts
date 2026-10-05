/**
 * Reglas de avance del seguimiento (state-machine.md §3 + RF-01…RF-07).
 *
 * Al finalizar una subetapa se evalúan sus guardas de salida y, si
 * corresponde, la transición del estado macro del expediente. Puro y
 * determinista (la fecha se inyecta): lo consume FinalizarSubetapaUseCase
 * dentro de la misma transacción que marca la subetapa como FINALIZADO.
 */

import { DomainError } from "../shared/domain-error.base.js";
import { fail, ok, type Result } from "../shared/result.js";
import type { ChecklistDef } from "./checklist-catalogo.js";
import { canTransition, type EstadoExpediente } from "./fsm.js";
import type { RangoFechas } from "./propuesta-fechas.js";
import type { ClaveSubetapa } from "./seguimiento-catalogo.js";

/** RN-06.1 (HU-0042): umbral de similitud Turnitin (estrictamente menor). */
export const UMBRAL_SIMILITUD = 20;

export function similitudConforme(porcentaje: number): boolean {
  return porcentaje < UMBRAL_SIMILITUD;
}

/** RN-PLZ-04: días corridos mínimos entre la publicación y la sustentación. */
export const DIAS_MINIMOS_PUBLICACION = 7;

export type EstadoDocumento = "PENDIENTE" | "CARGADO" | "OBSERVADO" | "APROBADO" | "RECHAZADO";

export interface Pronunciamiento {
  readonly rol: string;
  readonly dictamen: string;
}

export interface ValidacionRegistrada {
  readonly estado: string;
  readonly porcentaje: number | null;
  readonly detalle: string | null;
}

export interface ContextoAvance {
  readonly estado: EstadoExpediente;
  /** Estado al que se vuelve al levantar una observación (metadata del expediente). */
  readonly observadoDesde: EstadoExpediente | null;
  /** `null` = subetapa personalizada (HU-0052) sin reglas propias. */
  readonly claveSubetapa: string | null;
  readonly checklist: readonly ChecklistDef[];
  /** tipo → estado de la última versión cargada. */
  readonly documentos: ReadonlyMap<string, EstadoDocumento>;
  /** Terna de revisión del plan (E1). */
  readonly terna: readonly Pronunciamiento[];
  /** Jurados sorteados (E3–E4). */
  readonly jurados: readonly Pronunciamiento[];
  readonly sustentacion: { readonly fecha: string; readonly actaVeredicto: string | null } | null;
  /** Rango de fechas vigente propuesto por el alumno (HU-0038). */
  readonly propuestaFechas: RangoFechas | null;
  /** instancia (OTI_SIMILITUD, REPOSITORIO, SECRETARIA…) → registro. */
  readonly validaciones: ReadonlyMap<string, ValidacionRegistrada>;
  readonly datosAdmin: { readonly nroDecreto: string | null; readonly decanal: string | null };
  readonly hoy: Date;
}

export interface DecisionAvance {
  /** Estado macro destino; `null` = la subetapa no mueve el estado del expediente. */
  readonly transicion: EstadoExpediente | null;
}

const ESTADOS_CERRADOS: ReadonlySet<EstadoExpediente> = new Set([
  "ANULADO",
  "DESAPROBADO_TRUNCO",
  "TITULO_EMITIDO",
  "REGISTRADO",
]);

/** Subetapas que levantan una observación (vuelven al estado de origen). */
const LEVANTAMIENTOS: ReadonlySet<string> = new Set(["E1_LEVANTAMIENTO", "E3_LEVANTAMIENTO"]);

/** Subetapa → instancia institucional que debe estar APROBADA para cerrarla. */
const INSTANCIA_REQUERIDA: Partial<Record<ClaveSubetapa, string>> = {
  E5_TURNITIN: "OTI_SIMILITUD",
  E5_REPOSITORIO: "REPOSITORIO",
  E6_SECRETARIA: "SECRETARIA",
  E6_COMISION: "COMISION",
  E6_CONSEJO_FACULTAD: "CONSEJO_FACULTAD",
  E6_RESOLUCION: "RESOLUCION",
  E6_SISGRAD: "SISGRAD",
  E6_FIRMA_DECANO: "DECANO",
  E6_GRADOS_TITULOS: "GRADOS_TITULOS",
  E6_CONSEJO_UNIVERSITARIO: "CONSEJO_UNIVERSITARIO",
  E7_COLACION: "COLACION",
  E7_SUNEDU: "SUNEDU",
};

const ETIQUETA_INSTANCIA: Readonly<Record<string, string>> = {
  OTI_SIMILITUD: "evaluación de similitud (OTI/Turnitin)",
  REPOSITORIO: "registro en el repositorio institucional",
  SECRETARIA: "Secretaría Académica",
  COMISION: "Comisión de Grados y Títulos",
  CONSEJO_FACULTAD: "Consejo de Facultad",
  RESOLUCION: "resolución",
  SISGRAD: "registro en SISGRAD",
  DECANO: "firma del Decano",
  GRADOS_TITULOS: "Oficina de Grados y Títulos",
  CONSEJO_UNIVERSITARIO: "Consejo Universitario",
  COLACION: "programación de colación",
  SUNEDU: "registro en SUNEDU",
};

function pendiente(mensaje: string): Result<never, DomainError> {
  return fail(new DomainError("REQUISITO_PENDIENTE", mensaje));
}

function sinTransicion(): Result<DecisionAvance, DomainError> {
  return ok({ transicion: null });
}

function transitar(
  ctx: ContextoAvance,
  destino: EstadoExpediente,
): Result<DecisionAvance, DomainError> {
  if (!canTransition(ctx.estado, destino)) {
    return fail(
      new DomainError(
        "TRANSICION_INVALIDA",
        `El expediente está en ${ctx.estado}; esta subetapa requiere un estado que permita pasar a ${destino}`,
      ),
    );
  }
  return ok({ transicion: destino });
}

/** Documentos obligatorios asignados a la subetapa (guarda de carga). */
function requeridosDe(ctx: ContextoAvance, clave: string): readonly ChecklistDef[] {
  return ctx.checklist.filter((d) => d.obligatorio && d.requeridoEn === clave);
}

function verificarCargados(ctx: ContextoAvance, clave: string): Result<true, DomainError> {
  const faltan = requeridosDe(ctx, clave).filter((d) => {
    const e = ctx.documentos.get(d.tipo) ?? "PENDIENTE";
    return e !== "CARGADO" && e !== "APROBADO";
  });
  if (faltan.length > 0) {
    return pendiente(
      `Faltan documentos obligatorios o tienen observaciones: ${faltan.map((d) => d.nombre).join(", ")}`,
    );
  }
  return ok(true);
}

function titulares(lista: readonly Pronunciamiento[]): readonly Pronunciamiento[] {
  return lista.filter((p) => p.rol !== "SUPLENTE");
}

function verificarDesignados(
  lista: readonly Pronunciamiento[],
  quien: string,
): Result<true, DomainError> {
  const n = titulares(lista).length;
  if (n < 3) {
    return fail(
      new DomainError("JURADO_NO_ASIGNADO", `${quien} requiere 3 miembros titulares (hay ${n})`),
    );
  }
  return ok(true);
}

function verificarPronunciados(
  lista: readonly Pronunciamiento[],
  quien: string,
): Result<true, DomainError> {
  const designados = verificarDesignados(lista, quien);
  if (!designados.ok) return designados;
  const faltan = titulares(lista).filter((p) => p.dictamen === "PENDIENTE").length;
  if (faltan > 0) return pendiente(`Faltan ${faltan} pronunciamiento(s) de ${quien.toLowerCase()}`);
  return ok(true);
}

function verificarConformes(
  lista: readonly Pronunciamiento[],
  quien: string,
): Result<true, DomainError> {
  const pronunciados = verificarPronunciados(lista, quien);
  if (!pronunciados.ok) return pronunciados;
  const observados = titulares(lista).filter((p) => p.dictamen !== "FAVORABLE").length;
  if (observados > 0) {
    return pendiente(`${quien} mantiene ${observados} dictamen(es) observado(s)`);
  }
  return ok(true);
}

function hayObservados(lista: readonly Pronunciamiento[]): boolean {
  return titulares(lista).some((p) => p.dictamen === "OBSERVADO");
}

function verificarInstancia(ctx: ContextoAvance, instancia: string): Result<true, DomainError> {
  const v = ctx.validaciones.get(instancia);
  if (v?.estado !== "APROBADO") {
    return pendiente(
      `Registra como APROBADO: ${ETIQUETA_INSTANCIA[instancia] ?? instancia.toLowerCase()}`,
    );
  }
  return ok(true);
}

/** Días corridos (UTC) entre dos fechas ISO; null si la fecha no es válida. */
function diasHasta(hoy: Date, fechaIso: string): number | null {
  const destino = Date.parse(`${fechaIso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(destino)) return null;
  const base = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((destino - base) / 86_400_000);
}

/**
 * Evalúa si la subetapa `ctx.claveSubetapa` puede finalizarse y qué
 * transición macro provoca. Nunca lanza: devuelve Result tipado.
 */
export function evaluarCierreSubetapa(ctx: ContextoAvance): Result<DecisionAvance, DomainError> {
  if (ESTADOS_CERRADOS.has(ctx.estado)) {
    return fail(
      new DomainError(
        "TRANSICION_INVALIDA",
        `El expediente está en ${ctx.estado}; no admite avance de subetapas`,
      ),
    );
  }
  const clave = ctx.claveSubetapa;
  if (ctx.estado === "OBSERVADO" && !(clave && LEVANTAMIENTOS.has(clave))) {
    return pendiente("El expediente está observado: levanta la observación antes de continuar");
  }
  if (!clave) return sinTransicion();

  const instancia = INSTANCIA_REQUERIDA[clave as ClaveSubetapa];
  if (instancia) {
    const v = verificarInstancia(ctx, instancia);
    if (!v.ok) return v;
  }

  switch (clave as ClaveSubetapa) {
    // ---- E1 · Verificación inicial → PLAN_APROBADO ----
    case "E1_PRESENTACION_PLAN":
    case "E2_REVISION_DOCUMENTAL":
    case "E2_VALIDACION_EXPEDIENTE":
    case "E4_VERSION_FINAL": {
      const docs = verificarCargados(
        ctx,
        clave === "E2_REVISION_DOCUMENTAL" || clave === "E2_VALIDACION_EXPEDIENTE"
          ? "E2_CARGA_DOCUMENTOS"
          : clave,
      );
      return docs.ok ? sinTransicion() : docs;
    }
    case "E1_VALIDACION_DOCUMENTOS": {
      const docs = verificarCargados(ctx, "E1_PRESENTACION_PLAN");
      return docs.ok ? sinTransicion() : docs;
    }
    case "E1_ASIGNACION_TERNA": {
      const t = verificarDesignados(ctx.terna, "La terna");
      return t.ok ? sinTransicion() : t;
    }
    case "E1_REVISION_TERNA": {
      const t = verificarPronunciados(ctx.terna, "La terna");
      if (!t.ok) return t;
      return hayObservados(ctx.terna) ? transitar(ctx, "OBSERVADO") : sinTransicion();
    }
    case "E1_LEVANTAMIENTO":
    case "E3_LEVANTAMIENTO": {
      if (ctx.estado !== "OBSERVADO") return sinTransicion();
      const lista = clave === "E1_LEVANTAMIENTO" ? ctx.terna : ctx.jurados;
      const quien = clave === "E1_LEVANTAMIENTO" ? "La terna" : "El jurado";
      const c = verificarConformes(lista, quien);
      if (!c.ok) return c;
      const origen =
        ctx.observadoDesde ?? (clave === "E1_LEVANTAMIENTO" ? "EN_PLAN" : "EN_DICTAMEN");
      return transitar(ctx, origen);
    }
    case "E1_DECRETO": {
      const c = verificarConformes(ctx.terna, "La terna");
      if (!c.ok) return c;
      if (!ctx.datosAdmin.nroDecreto?.trim()) {
        return pendiente("Registra el N° de decreto de aprobación en Datos del expediente");
      }
      return transitar(ctx, "PLAN_APROBADO");
    }
    // ---- E2 · Borrador → EN_BORRADOR ----
    case "E2_CARGA_DOCUMENTOS": {
      const docs = verificarCargados(ctx, clave);
      return docs.ok ? transitar(ctx, "EN_BORRADOR") : docs;
    }
    // ---- E3 · Evaluación → EN_DICTAMEN → APTO_SUSTENTACION ----
    case "E3_SORTEO_JURADOS": {
      const j = verificarDesignados(ctx.jurados, "El jurado");
      if (!j.ok) return j;
      if (!ctx.datosAdmin.decanal?.trim()) {
        return pendiente("Registra la resolución decanal del sorteo en Datos del expediente");
      }
      return transitar(ctx, "EN_DICTAMEN");
    }
    case "E3_REVISION_JURADOS": {
      const j = verificarPronunciados(ctx.jurados, "El jurado");
      return j.ok ? sinTransicion() : j;
    }
    case "E3_OBSERVACIONES":
      return hayObservados(ctx.jurados) ? transitar(ctx, "OBSERVADO") : sinTransicion();
    case "E3_CONFORMIDAD_FINAL": {
      const j = verificarConformes(ctx.jurados, "El jurado");
      if (!j.ok) return j;
      const docs = verificarCargados(ctx, clave);
      return docs.ok ? transitar(ctx, "APTO_SUSTENTACION") : docs;
    }
    // ---- E4 · Sustentación → SUSTENTADO → EN_VALIDACION ----
    case "E4_PROPUESTA_FECHAS":
      return ctx.propuestaFechas
        ? sinTransicion()
        : pendiente("El tesista aún no propone su rango de fechas de sustentación");
    case "E4_COORDINACION_JURADOS":
      return ctx.sustentacion
        ? sinTransicion()
        : pendiente("Programa la sustentación (fecha, hora y lugar)");
    case "E4_PUBLICACION": {
      if (!ctx.sustentacion) return pendiente("Programa la sustentación antes de publicarla");
      const dias = diasHasta(ctx.hoy, ctx.sustentacion.fecha);
      if (dias === null) return pendiente("La fecha de sustentación no es válida");
      if (dias < DIAS_MINIMOS_PUBLICACION) {
        return fail(
          new DomainError(
            "PLAZO_VENCIDO",
            `La publicación exige al menos ${DIAS_MINIMOS_PUBLICACION} días de anticipación (faltan ${dias})`,
          ),
        );
      }
      return sinTransicion();
    }
    case "E4_SUSTENTACION": {
      if (ctx.estado !== "SUSTENTADO") {
        return pendiente("Registra el acta de sustentación con veredicto aprobatorio");
      }
      const docs = verificarCargados(ctx, clave);
      return docs.ok ? transitar(ctx, "EN_VALIDACION") : docs;
    }
    // ---- E5 · Validaciones → EN_APROBACION ----
    case "E5_REVISION_SIMILITUD": {
      const v = ctx.validaciones.get("OTI_SIMILITUD");
      if (v?.porcentaje === null || v?.porcentaje === undefined) {
        return pendiente("Registra el porcentaje de similitud del reporte Turnitin");
      }
      if (!similitudConforme(v.porcentaje)) {
        return fail(
          new DomainError(
            "TURNITIN_NO_CONFORME",
            `Similitud ${v.porcentaje} %: debe ser menor a ${UMBRAL_SIMILITUD} %`,
          ),
        );
      }
      return sinTransicion();
    }
    case "E5_REPOSITORIO": {
      const docs = verificarCargados(ctx, clave);
      return docs.ok ? sinTransicion() : docs;
    }
    case "E5_URL_REPOSITORIO": {
      const repo = ctx.validaciones.get("REPOSITORIO");
      if (repo?.estado !== "APROBADO" || !/https?:\/\/\S+/i.test(repo.detalle ?? "")) {
        return pendiente("Registra la URL del repositorio institucional (validación REPOSITORIO)");
      }
      return transitar(ctx, "EN_APROBACION");
    }
    // ---- E7 · Título → TITULO_EMITIDO ----
    case "E7_SUNEDU":
      return transitar(ctx, "TITULO_EMITIDO");
    default:
      return sinTransicion();
  }
}
