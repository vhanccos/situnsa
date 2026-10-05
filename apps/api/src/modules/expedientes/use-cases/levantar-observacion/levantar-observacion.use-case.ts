import { db, expedientes, mensajes, subetapas } from "@pis/db";
import {
  assertTransition,
  DomainError,
  type EstadoExpediente,
  fail,
  ok,
  type Result,
} from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../../infra/jobs/colas.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";
import { observadoDesdeDe } from "../../expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * Decide a qué estado vuelve un expediente observado: el guardado al
 * observar o, para datos anteriores a esa marca, REGISTRADO si aún no tiene
 * seguimiento y EN_PLAN si ya lo tiene.
 */
export function destinoLevantamiento(
  observadoDesde: EstadoExpediente | null,
  tieneSeguimiento: boolean,
): EstadoExpediente {
  return observadoDesde ?? (tieneSeguimiento ? "EN_PLAN" : "REGISTRADO");
}

/**
 * Levantar observación (OBSERVADO → estado de origen): el área verifica la
 * subsanación del tesista. Las observaciones de terna/jurado (E1.5/E3.5)
 * también se levantan al finalizar su subetapa de levantamiento.
 */
export class LevantarObservacionUseCase {
  async execute(
    id: string,
    comentario: string | undefined,
    actor: Actor,
  ): Promise<Result<{ id: string; estado: EstadoExpediente }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const rows = await tx
        .select({ id: expedientes.id, estado: expedientes.estado, metadata: expedientes.metadata })
        .from(expedientes)
        .where(eq(expedientes.id, id))
        .limit(1);
      const exp = rows[0];
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      if (exp.estado !== "OBSERVADO") {
        return fail(
          new DomainError("TRANSICION_INVALIDA", `El expediente no está observado (${exp.estado})`),
        );
      }
      const seguimiento = await tx
        .select({ id: subetapas.id })
        .from(subetapas)
        .where(eq(subetapas.expedienteId, id))
        .limit(1);
      const destino = destinoLevantamiento(observadoDesdeDe(exp.metadata), seguimiento.length > 0);
      const gate = assertTransition("OBSERVADO", destino);
      if (!gate.ok) return fail(gate.error);
      const { observadoDesde: _omitido, ...resto } = (exp.metadata ?? {}) as Record<
        string,
        unknown
      >;
      await tx
        .update(expedientes)
        .set({ estado: destino, metadata: resto, updatedAt: new Date() })
        .where(eq(expedientes.id, id));
      const nota = comentario?.trim();
      if (nota) {
        await tx.insert(mensajes).values({
          expedienteId: id,
          autorId: actor.id,
          texto: `Observación levantada: ${nota}`,
        });
      }
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: "OBSERVADO",
        estadoNuevo: destino,
        detalle: nota ? `Observación levantada: ${nota.slice(0, 200)}` : "Observación levantada",
      });
      return ok({ id, estado: destino });
    });
    if (r.ok) {
      await enqueueCorreo({
        expedienteId: id,
        asunto: "Observación levantada",
        titulo: "Tu subsanación fue aceptada",
        texto: "El área verificó la subsanación de la observación. Tu trámite continúa.",
      });
    }
    return r;
  }
}
