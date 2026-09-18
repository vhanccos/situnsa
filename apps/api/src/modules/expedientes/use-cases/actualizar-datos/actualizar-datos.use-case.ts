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

const CAMPOS_EXPEDIENTE = [
  "titulo",
  "programa",
  "nroDecreto",
  "recomendacion",
  "presidente",
  "secretario",
  "coAsesor",
  "fechaApertura",
  "fechaPresentacion",
  "nroOficio",
  "integrante",
  "presidenteE2",
  "secretarioE2",
  "suplenteE2",
  "decanal",
  "fechaSustentacion",
  "horaSustentacion",
  "lugarSustentacion",
  "modalidadVirtual",
] as const;

const CAMPOS_PERSONA = [
  ["Email", "email"],
  ["Telefono", "telefono"],
  ["Cui", "cui"],
  ["Nacionalidad", "nacionalidad"],
  ["Ciudad", "ciudad"],
  ["Direccion", "direccion"],
] as const;

function patchPersona(
  input: ActualizarDatosInput,
  prefijo: "participante1" | "participante2",
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [sufijo, columna] of CAMPOS_PERSONA) {
    const v = input[`${prefijo}${sufijo}` as keyof ActualizarDatosInput];
    if (v !== undefined) patch[columna] = v;
  }
  return patch;
}

/** PATCH autoguardado §6 (formulario completo): UoW + concurrencia + auditoría. */
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
      const patchExp: Record<string, unknown> = { updatedAt: new Date() };
      for (const k of CAMPOS_EXPEDIENTE) {
        const v = input[k];
        if (v !== undefined) patchExp[k] = v === "" ? null : v;
      }
      await tx.update(expedientes).set(patchExp).where(eq(expedientes.id, id));
      if (actual.participante1) {
        const p1 = patchPersona(input, "participante1");
        if (Object.keys(p1).length > 0) {
          await tx.update(usuarios).set(p1).where(eq(usuarios.id, actual.participante1.id));
        }
      }
      if (actual.participante2) {
        const p2 = patchPersona(input, "participante2");
        if (Object.keys(p2).length > 0) {
          await tx.update(usuarios).set(p2).where(eq(usuarios.id, actual.participante2.id));
        }
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
