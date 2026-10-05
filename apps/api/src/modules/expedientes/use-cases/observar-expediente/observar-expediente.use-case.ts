import { db, expedientes, mensajes } from "@pis/db";
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

export interface Actor {
  id: string;
  dni: string;
}

/** Contexto legible de la observación según el estado de origen. */
const CONTEXTO: Partial<Record<EstadoExpediente, string>> = {
  REGISTRADO: "Observación de inscripción",
  EN_PLAN: "Observación del plan",
  EN_BORRADOR: "Observación del borrador",
  EN_DICTAMEN: "Observación del jurado",
  EN_VALIDACION: "Observación en validaciones institucionales",
};

/**
 * Observar el expediente (state-machine.md: REGISTRADO/EN_PLAN/EN_BORRADOR/
 * EN_DICTAMEN/EN_VALIDACION → OBSERVADO). Guarda el estado de origen en
 * `metadata.observadoDesde` para que el levantamiento vuelva exactamente
 * allí, publica el motivo al tesista, audita y notifica.
 */
export class ObservarExpedienteUseCase {
  async execute(
    id: string,
    motivo: string,
    actor: Actor,
  ): Promise<Result<{ id: string; estado: string }, DomainError>> {
    const clean = motivo.trim();
    if (clean.length < 5)
      return fail(new DomainError("VALIDACION_FALLIDA", "El motivo requiere 5 caracteres mínimo"));
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const rows = await tx
        .select({
          id: expedientes.id,
          estado: expedientes.estado,
          metadata: expedientes.metadata,
        })
        .from(expedientes)
        .where(eq(expedientes.id, id))
        .limit(1);
      const exp = rows[0];
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const origen = exp.estado as EstadoExpediente;
      const gate = assertTransition(origen, "OBSERVADO");
      if (!gate.ok) return fail(gate.error);
      const contexto = CONTEXTO[origen] ?? "Observación";
      await tx
        .update(expedientes)
        .set({
          estado: "OBSERVADO",
          metadata: { ...(exp.metadata ?? {}), observadoDesde: origen },
          updatedAt: new Date(),
        })
        .where(eq(expedientes.id, id));
      await tx.insert(mensajes).values({
        expedienteId: id,
        autorId: actor.id,
        texto: `${contexto}: ${clean}`,
      });
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: origen,
        estadoNuevo: "OBSERVADO",
        detalle: `${contexto}: ${clean.slice(0, 200)}`,
      });
      return ok({ id: exp.id, estado: "OBSERVADO" as const, contexto });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      expedienteId: id,
      asunto: "Tu expediente tiene observaciones",
      titulo: r.value.contexto,
      texto: `${clean}\n\nSubsana la observación y vuelve a cargar los documentos indicados desde tu portal.`,
    });
    return ok({ id: r.value.id, estado: r.value.estado });
  }
}
