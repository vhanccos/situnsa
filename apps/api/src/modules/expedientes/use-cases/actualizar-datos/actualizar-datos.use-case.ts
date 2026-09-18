import type { ActualizarDatosInput } from "@pis/contracts";
import { db, expedientes, usuarios } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";
import { type DetalleRow, getDetalleById } from "../../expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/** PATCH autoguardado §6: Result pattern + concurrencia optimista + auditoría hash. */
export class ActualizarDatosUseCase {
  async execute(
    id: string,
    input: ActualizarDatosInput,
    actor: Actor,
  ): Promise<Result<DetalleRow, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const actual = await getDetalleById(tx, id);
      if (!actual) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      if (input.expectedUpdatedAt && input.expectedUpdatedAt !== actual.updatedAt) {
        return fail(
          new DomainError(
            "CONFLICTO_CONCURRENCIA",
            "Otro usuario guardó cambios más recientes. Recarga antes de sobrescribir.",
          ),
        );
      }
      // Siempre se toca updatedAt: es el token de concurrencia optimista (§6).
      await tx
        .update(expedientes)
        .set({
          ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
          ...(input.programa !== undefined ? { programa: input.programa } : {}),
          updatedAt: new Date(),
        })
        .where(eq(expedientes.id, id));
      if (
        actual.participante1 &&
        (input.participante1Email !== undefined ||
          input.participante1Telefono !== undefined ||
          input.participante1Cui !== undefined)
      ) {
        await tx
          .update(usuarios)
          .set({
            ...(input.participante1Email !== undefined ? { email: input.participante1Email } : {}),
            ...(input.participante1Telefono !== undefined
              ? { telefono: input.participante1Telefono }
              : {}),
            ...(input.participante1Cui !== undefined ? { cui: input.participante1Cui } : {}),
          })
          .where(eq(usuarios.id, actual.participante1.id));
      }
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: actual.estado,
        estadoNuevo: actual.estado,
        detalle: "Actualización de datos (autoguardado)",
      });
      const detalle = await getDetalleById(tx, id);
      if (!detalle) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      return ok(detalle);
    });
  }
}
