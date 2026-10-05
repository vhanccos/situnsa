import type { DbExecutor } from "@pis/db";
import {
  db,
  expedientes,
  jurados,
  juradosExpediente,
  mensajes,
  propuestasSustentacion,
  sustentaciones,
  validacionesInstitucionales,
} from "@pis/db";
import {
  assertTransition,
  DomainError,
  type EstadoExpediente,
  fail,
  fechaEnRango,
  ok,
  type Result,
  similitudConforme,
  UMBRAL_SIMILITUD,
  validarRangoPropuesto,
} from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import { appendAuditoria } from "../../expedientes/expedientes.auditoria.js";
import { observadoDesdeDe } from "../../expedientes/expedientes.repository.js";
import { propuestaVigente } from "../propuestas.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

export type Instancia = "TERNA" | "JURADO";

interface ExpedienteCierre {
  estado: EstadoExpediente;
  metadata: unknown;
}

async function expedienteDe(tx: DbExecutor, id: string): Promise<ExpedienteCierre | null> {
  const rows = await tx
    .select({ estado: expedientes.estado, metadata: expedientes.metadata })
    .from(expedientes)
    .where(eq(expedientes.id, id))
    .limit(1);
  const r = rows[0];
  return r ? { estado: r.estado as EstadoExpediente, metadata: r.metadata } : null;
}

const ESTADOS_TERNA: ReadonlySet<EstadoExpediente> = new Set(["REGISTRADO", "EN_PLAN"]);
const ESTADOS_JURADO: ReadonlySet<EstadoExpediente> = new Set([
  "PLAN_APROBADO",
  "EN_BORRADOR",
  "EN_DICTAMEN",
  "APTO_SUSTENTACION",
]);

/** Estado "efectivo" para reglas: si está observado, el de origen. */
function efectivo(exp: ExpedienteCierre): EstadoExpediente {
  return exp.estado === "OBSERVADO" ? (observadoDesdeDe(exp.metadata) ?? "EN_PLAN") : exp.estado;
}

/** E1 → terna de revisión del plan; E2–E4 → jurado sorteado. Puro. */
export function instanciaPorEstado(estadoEfectivo: EstadoExpediente): Instancia | null {
  if (ESTADOS_TERNA.has(estadoEfectivo)) return "TERNA";
  if (ESTADOS_JURADO.has(estadoEfectivo)) return "JURADO";
  return null;
}

/** Reglas de composición (RN-02.1 / RN-04): roles únicos y 3 titulares + 1 suplente. Puro. */
export function validarComposicion(
  actuales: ReadonlyArray<{ rol: string }>,
  rolNuevo: string,
): string | null {
  if (rolNuevo !== "VOCAL" && actuales.some((a) => a.rol === rolNuevo)) {
    return `Ya hay un ${rolNuevo.toLowerCase()} designado`;
  }
  const titulares = actuales.filter((a) => a.rol !== "SUPLENTE").length;
  if (rolNuevo !== "SUPLENTE" && titulares >= 3) return "Ya hay 3 miembros titulares designados";
  if (actuales.length >= 4) return "Máximo 3 titulares y 1 suplente";
  return null;
}

/** Designar miembro de la terna (E1.3) o del jurado (E3.2); crea el jurado si no existe. */
export class DesignarJuradoUseCase {
  async execute(
    expedienteId: string,
    input: {
      dni: string;
      nombres: string;
      apellidos: string;
      grado?: string;
      rol: string;
      instancia?: Instancia;
    },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const porEstado = instanciaPorEstado(efectivo(exp));
      const instancia = input.instancia ?? porEstado;
      if (!instancia || instancia !== porEstado) {
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            porEstado
              ? `En el estado ${exp.estado} solo se designa ${porEstado === "TERNA" ? "la terna" : "el jurado"}`
              : `En el estado ${exp.estado} no se designan jurados`,
          ),
        );
      }
      const actuales = await tx
        .select({ rol: juradosExpediente.rol, juradoId: juradosExpediente.juradoId })
        .from(juradosExpediente)
        .where(
          and(
            eq(juradosExpediente.expedienteId, expedienteId),
            eq(juradosExpediente.instancia, instancia),
          ),
        );
      const regla = validarComposicion(actuales, input.rol);
      if (regla) return fail(new DomainError("VALIDACION_FALLIDA", regla));

      await tx
        .insert(jurados)
        .values({
          dni: input.dni,
          nombres: input.nombres.trim(),
          apellidos: input.apellidos.trim(),
          grado: input.grado?.trim() || null,
        })
        .onConflictDoNothing({ target: jurados.dni });
      const fila = await tx
        .select({ id: jurados.id, nombres: jurados.nombres, apellidos: jurados.apellidos })
        .from(jurados)
        .where(eq(jurados.dni, input.dni))
        .limit(1);
      const jurado = fila[0];
      if (!jurado)
        return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar el jurado"));
      if (actuales.some((a) => a.juradoId === jurado.id)) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Esa persona ya está designada"));
      }
      const vin = await tx
        .insert(juradosExpediente)
        .values({ juradoId: jurado.id, expedienteId, instancia, rol: input.rol })
        .returning({ id: juradosExpediente.id });
      if (!vin[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo designar"));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: exp.estado,
        detalle: `${instancia === "TERNA" ? "Terna" : "Jurado"}: ${jurado.nombres} ${jurado.apellidos} (${input.rol})`,
      });
      return ok({ id: vin[0].id });
    });
  }
}

/**
 * Dictamen (registro delegado RN-08/HU-0035): lo asienta el responsable con
 * el pronunciamiento del jurado como evidencia. OBSERVADO exige comentario.
 * Las consecuencias en el estado las aplican las reglas de avance al cerrar
 * la subetapa de revisión (E1.4 / E3.4).
 */
export class DictaminarUseCase {
  async execute(
    expedienteId: string,
    vinculoId: string,
    input: { dictamen: "FAVORABLE" | "OBSERVADO"; comentario?: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    if (input.dictamen === "OBSERVADO" && !(input.comentario ?? "").trim()) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "Observar exige un comentario para el tesista"),
      );
    }
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      if (exp.estado === "ANULADO" || exp.estado === "TITULO_EMITIDO") {
        return fail(new DomainError("TRANSICION_INVALIDA", `Expediente ${exp.estado}`));
      }
      const rows = await tx
        .select()
        .from(juradosExpediente)
        .where(
          and(
            eq(juradosExpediente.id, vinculoId),
            eq(juradosExpediente.expedienteId, expedienteId),
          ),
        )
        .limit(1);
      const vinc = rows[0];
      if (!vinc) return fail(new DomainError("NO_ENCONTRADO", "Designación no encontrada"));
      await tx
        .update(juradosExpediente)
        .set({ dictamen: input.dictamen, comentario: input.comentario?.trim() || null })
        .where(eq(juradosExpediente.id, vinculoId));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: exp.estado,
        detalle: `Dictamen ${input.dictamen} de ${vinc.instancia === "TERNA" ? "la terna" : "el jurado"} (${vinc.rol}, registro delegado)`,
      });
      return ok({ id: vinculoId });
    });
  }
}

/** Fecha civil de hoy en Arequipa (AAAA-MM-DD). */
function hoyLima(ahora: Date): string {
  return ahora.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/**
 * El alumno (o el área en su nombre) propone el rango de fechas para
 * sustentar (HU-0038, RN-05.1). Cada propuesta nueva pasa a ser la vigente y
 * las anteriores quedan como historial de la renegociación (RN-05.2).
 */
export class ProponerFechasSustentacionUseCase {
  async execute(
    expedienteId: string,
    input: { desde: string; hasta: string; comentario?: string },
    actor: Actor,
    ahora: Date = new Date(),
  ): Promise<Result<{ id: string }, DomainError>> {
    const rango = validarRangoPropuesto({ desde: input.desde, hasta: input.hasta }, hoyLima(ahora));
    if (!rango.ok) return rango;
    const comentario = input.comentario?.trim() || null;
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      if (exp.estado !== "APTO_SUSTENTACION") {
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            `Las fechas de sustentación se proponen con el expediente APTO_SUSTENTACION (actual: ${exp.estado})`,
          ),
        );
      }
      const sust = await tx
        .select({ acta: sustentaciones.actaVeredicto })
        .from(sustentaciones)
        .where(eq(sustentaciones.expedienteId, expedienteId))
        .limit(1);
      if (sust[0]?.acta) {
        return fail(
          new DomainError("TRANSICION_INVALIDA", "La sustentación ya tiene acta registrada"),
        );
      }
      const ins = await tx
        .insert(propuestasSustentacion)
        .values({
          expedienteId,
          desde: input.desde,
          hasta: input.hasta,
          comentario,
          propuestaPor: actor.id || null,
        })
        .returning({ id: propuestasSustentacion.id });
      if (!ins[0]) {
        return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar la propuesta"));
      }
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: exp.estado,
        detalle: `Propuesta de fechas de sustentación: del ${input.desde} al ${input.hasta}${comentario ? ` · ${comentario.slice(0, 160)}` : ""}`,
      });
      return ok({ id: ins[0].id });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      expedienteId,
      asunto: "Propuesta de fechas de sustentación registrada",
      titulo: "Recibimos tu propuesta de fechas",
      texto: `Rango propuesto: del ${input.desde} al ${input.hasta}. El área coordinará con el jurado y te comunicará la fecha definitiva.`,
    });
    return r;
  }
}

/** Programar (o reprogramar mientras no tenga acta) la sustentación (RF-05). */
export class ProgramarSustentacionUseCase {
  async execute(
    expedienteId: string,
    input: { fecha: string; hora: string; lugar: string; modalidad: string },
    actor: Actor,
    ahora: Date = new Date(),
  ): Promise<Result<{ id: string }, DomainError>> {
    const lugar = input.lugar.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha) || Number.isNaN(Date.parse(input.fecha))) {
      return fail(new DomainError("VALIDACION_FALLIDA", "Fecha inválida (AAAA-MM-DD)"));
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.hora) || lugar.length < 3) {
      return fail(new DomainError("VALIDACION_FALLIDA", "Hora (HH:MM) y lugar son obligatorios"));
    }
    if (input.fecha <= hoyLima(ahora)) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "La fecha de sustentación debe ser futura"),
      );
    }
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      if (exp.estado !== "APTO_SUSTENTACION") {
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            `La sustentación se programa con el expediente APTO_SUSTENTACION (actual: ${exp.estado})`,
          ),
        );
      }
      const prev = await tx
        .select()
        .from(sustentaciones)
        .where(eq(sustentaciones.expedienteId, expedienteId))
        .limit(1);
      if (prev[0]?.actaVeredicto) {
        return fail(
          new DomainError("TRANSICION_INVALIDA", "La sustentación ya tiene acta registrada"),
        );
      }
      // RN-05.1: la fecha definitiva sale del rango propuesto por el alumno.
      const propuesta = await propuestaVigente(tx, expedienteId);
      if (propuesta && !fechaEnRango(input.fecha, propuesta)) {
        return fail(
          new DomainError(
            "VALIDACION_FALLIDA",
            `La fecha está fuera del rango propuesto por el tesista (${propuesta.desde} a ${propuesta.hasta}). Si cambió la disponibilidad, registra una nueva propuesta.`,
          ),
        );
      }
      const datos = { fecha: input.fecha, hora: input.hora, lugar, modalidad: input.modalidad };
      let id: string;
      if (prev[0]) {
        await tx.update(sustentaciones).set(datos).where(eq(sustentaciones.id, prev[0].id));
        id = prev[0].id;
      } else {
        const ins = await tx
          .insert(sustentaciones)
          .values({ expedienteId, ...datos })
          .returning({ id: sustentaciones.id });
        if (!ins[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo programar"));
        id = ins[0].id;
      }
      // Mantiene sincronizados los datos de la ETAPA 02 (documentos y actas).
      await tx
        .update(expedientes)
        .set({
          fechaSustentacion: input.fecha,
          horaSustentacion: input.hora,
          lugarSustentacion: lugar.toUpperCase(),
          updatedAt: ahora,
        })
        .where(eq(expedientes.id, expedienteId));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: exp.estado,
        detalle: `Sustentación ${prev[0] ? "reprogramada" : "programada"}: ${input.fecha} ${input.hora} · ${lugar}`,
      });
      return ok({ id, reprogramada: !!prev[0] });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      expedienteId,
      asunto: r.value.reprogramada ? "Sustentación reprogramada" : "Sustentación programada",
      titulo: r.value.reprogramada
        ? "Tu sustentación fue reprogramada"
        : "Tu sustentación fue programada",
      texto: `Fecha: ${input.fecha} · Hora: ${input.hora} · Lugar: ${lugar} (${input.modalidad.toLowerCase()}).`,
    });
    return ok({ id: r.value.id });
  }
}

/**
 * Acta de sustentación (RF-05 E4.5): veredicto aprobatorio
 * APTO_SUSTENTACION → SUSTENTADO; desaprobación → DESAPROBADO_TRUNCO (FSM).
 */
export class RegistrarActaUseCase {
  async execute(
    expedienteId: string,
    veredicto: "FELICITACION" | "UNANIMIDAD" | "MAYORIA" | "DESAPROBACION",
    actor: Actor,
  ): Promise<Result<{ id: string; estado: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const prev = await tx
        .select()
        .from(sustentaciones)
        .where(eq(sustentaciones.expedienteId, expedienteId))
        .limit(1);
      const sust = prev[0];
      if (!sust)
        return fail(new DomainError("VALIDACION_FALLIDA", "Primero programa la sustentación"));
      if (sust.actaVeredicto) {
        return fail(new DomainError("TRANSICION_INVALIDA", "El acta ya fue registrada"));
      }
      const destino: EstadoExpediente =
        veredicto === "DESAPROBACION" ? "DESAPROBADO_TRUNCO" : "SUSTENTADO";
      const gate = assertTransition(exp.estado, destino);
      if (!gate.ok) return fail(gate.error);
      await tx
        .update(sustentaciones)
        .set({ actaVeredicto: veredicto, actaFecha: new Date() })
        .where(eq(sustentaciones.id, sust.id));
      await tx
        .update(expedientes)
        .set({ estado: destino, updatedAt: new Date() })
        .where(eq(expedientes.id, expedienteId));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: destino,
        detalle: `Acta de sustentación: ${veredicto}`,
      });
      return ok({ id: sust.id, estado: destino });
    });
    if (r.ok) {
      const aprobado = r.value.estado === "SUSTENTADO";
      await enqueueCorreo({
        expedienteId,
        asunto: aprobado ? "Sustentación aprobada" : "Resultado de la sustentación",
        titulo: aprobado
          ? "¡Felicitaciones! Aprobaste la sustentación"
          : "Resultado de la sustentación",
        texto: aprobado
          ? "El acta de sustentación fue registrada. Continúa la etapa de validaciones institucionales (Turnitin y repositorio)."
          : "El jurado registró un veredicto desaprobatorio. El área de titulación te indicará cómo reiniciar el trámite.",
      });
    }
    return r;
  }
}

/**
 * Validación institucional por instancia (RF-06/07, upsert). Para
 * OTI_SIMILITUD el porcentaje es obligatorio y el estado se deriva de la
 * regla < 20 % (HU-0042): un reporte no conforme observa el expediente en
 * EN_VALIDACION y uno conforme posterior levanta esa observación.
 */
export class RegistrarValidacionUseCase {
  async execute(
    expedienteId: string,
    input: { instancia: string; estado: string; porcentaje?: number; detalle?: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const esSimilitud = input.instancia === "OTI_SIMILITUD";
    if (esSimilitud && input.porcentaje === undefined) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "Registra el porcentaje de similitud del reporte"),
      );
    }
    const porcentaje = esSimilitud ? (input.porcentaje ?? null) : null;
    const estado =
      porcentaje !== null
        ? similitudConforme(porcentaje)
          ? "APROBADO"
          : "OBSERVADO"
        : input.estado;
    const detalle = input.detalle?.trim() || null;
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const exp = await expedienteDe(tx, expedienteId);
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      if (exp.estado === "ANULADO" || exp.estado === "DESAPROBADO_TRUNCO") {
        return fail(new DomainError("TRANSICION_INVALIDA", `Expediente ${exp.estado}`));
      }
      const prev = await tx
        .select({ id: validacionesInstitucionales.id })
        .from(validacionesInstitucionales)
        .where(
          and(
            eq(validacionesInstitucionales.expedienteId, expedienteId),
            eq(validacionesInstitucionales.instancia, input.instancia),
          ),
        )
        .limit(1);
      let id: string;
      if (prev[0]) {
        await tx
          .update(validacionesInstitucionales)
          .set({ estado, porcentaje, detalle })
          .where(eq(validacionesInstitucionales.id, prev[0].id));
        id = prev[0].id;
      } else {
        const ins = await tx
          .insert(validacionesInstitucionales)
          .values({ expedienteId, instancia: input.instancia, estado, porcentaje, detalle })
          .returning({ id: validacionesInstitucionales.id });
        if (!ins[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar"));
        id = ins[0].id;
      }
      let estadoFinal: EstadoExpediente = exp.estado;
      if (esSimilitud && estado === "OBSERVADO" && exp.estado === "EN_VALIDACION") {
        estadoFinal = "OBSERVADO";
        await tx
          .update(expedientes)
          .set({
            estado: "OBSERVADO",
            metadata: {
              ...((exp.metadata as Record<string, unknown>) ?? {}),
              observadoDesde: "EN_VALIDACION",
            },
            updatedAt: new Date(),
          })
          .where(eq(expedientes.id, expedienteId));
        await tx.insert(mensajes).values({
          expedienteId,
          autorId: actor.id,
          texto: `Similitud Turnitin ${porcentaje} % (límite: menor a ${UMBRAL_SIMILITUD} %). Referencia correctamente las fuentes y vuelve a enviar a OTI.`,
        });
      } else if (
        esSimilitud &&
        estado === "APROBADO" &&
        exp.estado === "OBSERVADO" &&
        observadoDesdeDe(exp.metadata) === "EN_VALIDACION"
      ) {
        estadoFinal = "EN_VALIDACION";
        const { observadoDesde: _previo, ...resto } = (exp.metadata ?? {}) as Record<
          string,
          unknown
        >;
        await tx
          .update(expedientes)
          .set({ estado: "EN_VALIDACION", metadata: resto, updatedAt: new Date() })
          .where(eq(expedientes.id, expedienteId));
      }
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: estadoFinal,
        detalle: `${input.instancia}: ${estado}${porcentaje !== null ? ` (${porcentaje} %)` : ""}`,
      });
      return ok({ id, observado: estadoFinal === "OBSERVADO" && exp.estado !== "OBSERVADO" });
    });
    if (!r.ok) return r;
    if (r.value.observado) {
      await enqueueCorreo({
        expedienteId,
        asunto: "Resultado de similitud no conforme",
        titulo: "Tu reporte de similitud supera el límite",
        texto: `El reporte Turnitin registró ${porcentaje} % de similitud (debe ser menor a ${UMBRAL_SIMILITUD} %). Corrige las citas y referencias y vuelve a presentar el documento.`,
      });
    }
    return ok({ id: r.value.id });
  }
}
