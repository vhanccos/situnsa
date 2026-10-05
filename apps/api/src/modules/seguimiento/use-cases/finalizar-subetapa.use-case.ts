import {
  type DbExecutor,
  db,
  documentos,
  expedientes,
  juradosExpediente,
  mensajes,
  subetapas,
  sustentaciones,
  validacionesInstitucionales,
} from "@pis/db";
import {
  type ContextoAvance,
  DomainError,
  type EstadoDocumento,
  type EstadoExpediente,
  evaluarCierreSubetapa,
  fail,
  ok,
  type Result,
  type ValidacionRegistrada,
} from "@pis/domain";
import { and, asc, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import { propuestaVigente } from "../../cierre/propuestas.repository.js";
import { appendAuditoria } from "../../expedientes/expedientes.auditoria.js";
import { leerChecklist, observadoDesdeDe } from "../../expedientes/expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

export interface SubetapaFinalizada {
  id: string;
  etapa: number;
  orden: number;
  estado: string;
  siguienteId: string | null;
  estadoExpediente: string;
}

/** Lee todo lo que las reglas de avance necesitan, dentro de la transacción. */
export async function contextoAvance(
  tx: DbExecutor,
  exp: {
    id: string;
    estado: string;
    metadata: unknown;
    nroDecreto: string | null;
    decanal: string | null;
  },
  claveSubetapa: string | null,
  hoy: Date,
): Promise<ContextoAvance> {
  const docs = await tx
    .select({ tipo: documentos.tipo, version: documentos.version, estado: documentos.estado })
    .from(documentos)
    .where(eq(documentos.expedienteId, exp.id));
  const ultimos = new Map<string, { version: number; estado: EstadoDocumento }>();
  for (const d of docs) {
    const prev = ultimos.get(d.tipo);
    if (!prev || d.version > prev.version)
      ultimos.set(d.tipo, { version: d.version, estado: d.estado });
  }
  const designados = await tx
    .select({
      instancia: juradosExpediente.instancia,
      rol: juradosExpediente.rol,
      dictamen: juradosExpediente.dictamen,
    })
    .from(juradosExpediente)
    .where(eq(juradosExpediente.expedienteId, exp.id));
  const sust = await tx
    .select({ fecha: sustentaciones.fecha, actaVeredicto: sustentaciones.actaVeredicto })
    .from(sustentaciones)
    .where(eq(sustentaciones.expedienteId, exp.id))
    .limit(1);
  const vals = await tx
    .select({
      instancia: validacionesInstitucionales.instancia,
      estado: validacionesInstitucionales.estado,
      porcentaje: validacionesInstitucionales.porcentaje,
      detalle: validacionesInstitucionales.detalle,
    })
    .from(validacionesInstitucionales)
    .where(eq(validacionesInstitucionales.expedienteId, exp.id));
  const propuesta = await propuestaVigente(tx, exp.id);
  return {
    estado: exp.estado as EstadoExpediente,
    observadoDesde: observadoDesdeDe(exp.metadata),
    claveSubetapa,
    checklist: await leerChecklist(tx),
    documentos: new Map([...ultimos].map(([tipo, v]) => [tipo, v.estado])),
    terna: designados.filter((d) => d.instancia === "TERNA"),
    jurados: designados.filter((d) => d.instancia === "JURADO"),
    sustentacion: sust[0] ?? null,
    propuestaFechas: propuesta ? { desde: propuesta.desde, hasta: propuesta.hasta } : null,
    validaciones: new Map<string, ValidacionRegistrada>(
      vals.map((v) => [
        v.instancia,
        { estado: v.estado, porcentaje: v.porcentaje, detalle: v.detalle },
      ]),
    ),
    datosAdmin: { nroDecreto: exp.nroDecreto, decanal: exp.decanal },
    hoy,
  };
}

/**
 * Finalizar subetapa (RN-08 + RN-09 + reglas de avance):
 * 1. Solo EN_CURSO → FINALIZADO (secuencial).
 * 2. Evalúa las guardas de salida de la subetapa (reglas-avance.ts) y, si
 *    corresponde, transita el estado macro del expediente (FSM).
 * 3. Habilita la siguiente subetapa, audita y notifica. Todo en un COMMIT.
 */
export class FinalizarSubetapaUseCase {
  async execute(
    subetapaId: string,
    actor: Actor,
    ahora: Date = new Date(),
  ): Promise<Result<SubetapaFinalizada, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const rows = await tx.select().from(subetapas).where(eq(subetapas.id, subetapaId)).limit(1);
      const sub = rows[0];
      if (!sub) return fail(new DomainError("NO_ENCONTRADO", "Subetapa no encontrada"));
      if (sub.estado !== "EN_CURSO") {
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            `Solo se puede finalizar una subetapa EN_CURSO (actual: ${sub.estado})`,
          ),
        );
      }
      const expRows = await tx
        .select({
          id: expedientes.id,
          codigo: expedientes.codigo,
          estado: expedientes.estado,
          metadata: expedientes.metadata,
          nroDecreto: expedientes.nroDecreto,
          decanal: expedientes.decanal,
        })
        .from(expedientes)
        .where(eq(expedientes.id, sub.expedienteId))
        .limit(1);
      const exp = expRows[0];
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));

      const ctx = await contextoAvance(tx, exp, sub.clave, ahora);
      const decision = evaluarCierreSubetapa(ctx);
      if (!decision.ok) return fail(decision.error);
      const destino = decision.value.transicion;

      if (destino) {
        const { observadoDesde: _previo, ...base } = (exp.metadata ?? {}) as Record<
          string,
          unknown
        >;
        const metadata = destino === "OBSERVADO" ? { ...base, observadoDesde: exp.estado } : base;
        await tx
          .update(expedientes)
          .set({ estado: destino, metadata, updatedAt: ahora })
          .where(eq(expedientes.id, exp.id));
        if (destino === "OBSERVADO") {
          // Las observaciones de terna/jurado se publican al tesista (registro delegado).
          const instancia = sub.etapa === 1 ? "TERNA" : "JURADO";
          const obs = await tx
            .select({ rol: juradosExpediente.rol, comentario: juradosExpediente.comentario })
            .from(juradosExpediente)
            .where(
              and(
                eq(juradosExpediente.expedienteId, exp.id),
                eq(juradosExpediente.instancia, instancia),
                eq(juradosExpediente.dictamen, "OBSERVADO"),
              ),
            );
          const detalle = obs
            .map((o) => `${o.rol}: ${o.comentario?.trim() || "sin comentario"}`)
            .join(" · ");
          await tx.insert(mensajes).values({
            expedienteId: exp.id,
            autorId: actor.id,
            texto: `Observaciones de ${instancia === "TERNA" ? "la terna" : "el jurado"}: ${detalle}`,
          });
        }
      } else {
        await tx.update(expedientes).set({ updatedAt: ahora }).where(eq(expedientes.id, exp.id));
      }

      await tx
        .update(subetapas)
        .set({ estado: "FINALIZADO", fin: ahora })
        .where(eq(subetapas.id, subetapaId));
      // RN-09: avance secuencial (etapa, orden).
      const siguientes = await tx
        .select()
        .from(subetapas)
        .where(
          and(eq(subetapas.expedienteId, sub.expedienteId), eq(subetapas.estado, "NO_INICIADO")),
        )
        .orderBy(asc(subetapas.etapa), asc(subetapas.orden))
        .limit(1);
      const siguiente = siguientes[0] ?? null;
      if (siguiente) {
        await tx
          .update(subetapas)
          .set({ estado: "EN_CURSO", inicio: ahora, alertadaAt: null })
          .where(eq(subetapas.id, siguiente.id));
      }
      const estadoFinal = destino ?? exp.estado;
      await appendAuditoria(tx, {
        expedienteId: exp.id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: estadoFinal,
        detalle: `Subetapa ${sub.etapa}.${sub.orden} finalizada${siguiente ? `; habilitada ${siguiente.etapa}.${siguiente.orden}` : "; seguimiento completo"}${destino ? `; expediente → ${destino}` : ""}`,
      });
      return ok({
        id: sub.id,
        etapa: sub.etapa,
        orden: sub.orden,
        nombre: sub.nombre,
        estado: "FINALIZADO",
        siguienteId: siguiente?.id ?? null,
        siguienteNombre: siguiente
          ? `${siguiente.etapa}.${siguiente.orden} ${siguiente.nombre}`
          : null,
        estadoExpediente: estadoFinal,
        cambioEstado: destino,
        expedienteId: exp.id,
      });
    });
    if (!r.ok) return r;
    const v = r.value;
    await enqueueCorreo({
      expedienteId: v.expedienteId,
      asunto: v.cambioEstado ? "Tu trámite cambió de estado" : "Avance en tu trámite de titulación",
      titulo: `Subetapa ${v.etapa}.${v.orden} finalizada`,
      texto: [
        `Se finalizó la subetapa ${v.etapa}.${v.orden} «${v.nombre}».`,
        v.siguienteNombre
          ? `Ahora en curso: ${v.siguienteNombre}.`
          : "Tu seguimiento está completo.",
      ].join("\n\n"),
    });
    return ok({
      id: v.id,
      etapa: v.etapa,
      orden: v.orden,
      estado: v.estado,
      siguienteId: v.siguienteId,
      estadoExpediente: v.estadoExpediente,
    });
  }
}
