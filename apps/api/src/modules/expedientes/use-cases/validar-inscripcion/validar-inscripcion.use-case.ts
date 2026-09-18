import { db, expedientes, subetapas } from "@pis/db";
import { assertTransition, DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { obtenerFlujo } from "../../../seguimiento/catalogo-reader.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";
import { type DetalleRow, getDetalleById } from "../../expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * §12 Validar inscripción: REGISTRADO|OBSERVADO → EN_PLAN (FSM) + genera
 * las 38 subetapas de seguimiento + auditoría. OBSERVADO → EN_PLAN levanta
 * la observación (B1). Si ya fue validado, el cliente recibe el detalle
 * para acceso directo (criterio §20 Validación).
 * El flujo se lee del catálogo en DB (B3) con fallback al código.
 */
export class ValidarInscripcionUseCase {
  async execute(
    id: string,
    actor: Actor,
  ): Promise<Result<{ detalle: DetalleRow; yaValidado: boolean }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const actual = await getDetalleById(tx, id);
      if (!actual) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      if (actual.estado !== "REGISTRADO" && actual.estado !== "OBSERVADO") {
        return ok({ detalle: actual, yaValidado: true });
      }
      const gate = assertTransition(actual.estado, "EN_PLAN");
      if (!gate.ok) return fail(gate.error);
      await tx
        .update(expedientes)
        .set({ estado: "EN_PLAN", updatedAt: new Date() })
        .where(eq(expedientes.id, id));
      const flujo = await obtenerFlujo();
      for (const etapa of flujo) {
        for (const s of etapa.subetapas) {
          const primera = etapa.numero === 1 && s.orden === 1;
          await tx.insert(subetapas).values({
            expedienteId: id,
            etapa: etapa.numero,
            orden: s.orden,
            nombre: s.nombre,
            plazo: s.plazo,
            estado: primera ? "EN_CURSO" : "NO_INICIADO",
            responsable: etapa.responsable,
            inicio: primera ? new Date() : null,
          });
        }
      }
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: actual.estado,
        estadoNuevo: "EN_PLAN",
        detalle:
          actual.estado === "OBSERVADO"
            ? "Observación levantada: validación de inscripción (genera seguimiento)"
            : "Validación de inscripción (genera seguimiento)",
      });
      const detalle = await getDetalleById(tx, id);
      if (!detalle) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      return ok({ detalle, yaValidado: false });
    });
  }
}
