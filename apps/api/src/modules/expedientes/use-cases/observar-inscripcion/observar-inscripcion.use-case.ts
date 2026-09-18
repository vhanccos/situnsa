import { db, expedientes, mensajes } from "@pis/db";
import { assertTransition, DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../../infra/jobs/colas.js";
import { appendAuditoria } from "../../../expedientes/expedientes.auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * Observar inscripción: REGISTRADO → OBSERVADO con motivo obligatorio.
 * Registra el motivo como mensaje visible al tesista + auditoría + correo.
 * Levantar la observación es re-validar (OBSERVADO → REGISTRADO vía validar
 * cuando corresponda, o directo a EN_PLAN si ya subsanó).
 */
export class ObservarInscripcionUseCase {
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
        .select({ id: expedientes.id, estado: expedientes.estado, codigo: expedientes.codigo })
        .from(expedientes)
        .where(eq(expedientes.id, id))
        .limit(1);
      const exp = rows[0];
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const gate = assertTransition(exp.estado as "REGISTRADO", "OBSERVADO");
      if (!gate.ok) return fail(gate.error);
      await tx
        .update(expedientes)
        .set({ estado: "OBSERVADO", updatedAt: new Date() })
        .where(eq(expedientes.id, id));
      await tx.insert(mensajes).values({
        expedienteId: id,
        autorId: actor.id,
        texto: `Observación de inscripción: ${clean}`,
      });
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: "REGISTRADO",
        estadoNuevo: "OBSERVADO",
        detalle: `Inscripción observada: ${clean.slice(0, 200)}`,
      });
      return ok({ id: exp.id, estado: "OBSERVADO" as const, codigo: exp.codigo });
    });
    if (r.ok) {
      await enqueueCorreo({
        expedienteId: id,
        codigo: r.value.codigo,
        texto: `Tu inscripción fue observada: ${clean}`,
      });
    }
    return r.ok ? ok({ id: r.value.id, estado: r.value.estado }) : r;
  }
}
