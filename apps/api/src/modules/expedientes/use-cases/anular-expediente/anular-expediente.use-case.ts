import { db, expedientes } from "@pis/db";
import { assertTransition, DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";
import { type DetalleRow, getDetalleById } from "../../expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/** ELIMINAR REGISTRO: borrado lógico → ANULADO (RN legacy 86_BD_Eliminar). */
export class AnularExpedienteUseCase {
  async execute(
    id: string,
    motivo: string | undefined,
    actor: Actor,
  ): Promise<Result<DetalleRow, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const actual = await getDetalleById(tx, id);
      if (!actual) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      const gate = assertTransition(actual.estado, "ANULADO");
      if (!gate.ok) return fail(gate.error);
      await tx
        .update(expedientes)
        .set({ estado: "ANULADO", updatedAt: new Date() })
        .where(eq(expedientes.id, id));
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: actual.estado,
        estadoNuevo: "ANULADO",
        detalle: motivo?.trim() ? `Anulación: ${motivo.trim()}` : "Anulación (borrado lógico)",
      });
      const detalle = await getDetalleById(tx, id);
      if (!detalle) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      return ok(detalle);
    });
  }
}
