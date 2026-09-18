import { db, subetapas } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { and, asc, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import { appendAuditoria } from "../../expedientes/expedientes.auditoria.js";
import { getDetalleById } from "../../expedientes/expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * Finalizar subetapa (RN-08 + RN-09): solo EN_CURSO → FINALIZADO, y
 * habilita la siguiente NO_INICIADO (misma etapa, si no la siguiente
 * etapa) como EN_CURSO. El permiso `seguimiento.aprobar` (solo staff)
 * garantiza RN-08; el avance secuencial garantiza RN-09.
 */
export class FinalizarSubetapaUseCase {
  async execute(
    subetapaId: string,
    actor: Actor,
  ): Promise<
    Result<
      { id: string; etapa: number; orden: number; estado: string; siguienteId: string | null },
      DomainError
    >
  > {
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
      const ahora = new Date();
      await tx
        .update(subetapas)
        .set({ estado: "FINALIZADO", fin: ahora })
        .where(eq(subetapas.id, subetapaId));
      // Siguiente pendiente en orden (etapa, orden): RN-09 = avance secuencial.
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
          .set({ estado: "EN_CURSO", inicio: ahora })
          .where(eq(subetapas.id, siguiente.id));
      }
      const detalle = await getDetalleById(tx, sub.expedienteId);
      await appendAuditoria(tx, {
        expedienteId: sub.expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: detalle?.estado ?? null,
        estadoNuevo: detalle?.estado ?? "REGISTRADO",
        detalle: `Subetapa ${sub.etapa}.${sub.orden} finalizada${siguiente ? `; habilitada ${siguiente.etapa}.${siguiente.orden}` : "; etapa completa"}`,
      });
      return ok({
        id: sub.id,
        etapa: sub.etapa,
        orden: sub.orden,
        estado: "FINALIZADO" as const,
        siguienteId: siguiente?.id ?? null,
        expedienteId: sub.expedienteId,
        codigo: detalle?.codigo ?? "",
      });
    });
    if (r.ok) {
      await enqueueCorreo({
        expedienteId: r.value.expedienteId,
        codigo: r.value.codigo,
        texto: `Avance en tu trámite: subetapa ${r.value.etapa}.${r.value.orden} finalizada`,
      });
    }
    if (!r.ok) return r;
    return ok({
      id: r.value.id,
      etapa: r.value.etapa,
      orden: r.value.orden,
      estado: r.value.estado,
      siguienteId: r.value.siguienteId,
    });
  }
}
