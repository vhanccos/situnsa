import { db, expedientes, subetapas } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import { appendAuditoria } from "../../expedientes/expedientes.auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * Derivación de subetapa (HU-0054, permissions-matrix §3): cambia el
 * responsable de una subetapa no finalizada; queda en el historial
 * (origen → destino) y se avisa por correo al nuevo responsable.
 */
export class DerivarSubetapaUseCase {
  async execute(
    subetapaId: string,
    input: { responsable: string; motivo?: string },
    actor: Actor,
  ): Promise<Result<{ id: string; responsable: string }, DomainError>> {
    const destino = input.responsable.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(destino)) {
      return fail(new DomainError("VALIDACION_FALLIDA", "Correo del nuevo responsable inválido"));
    }
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const rows = await tx.select().from(subetapas).where(eq(subetapas.id, subetapaId)).limit(1);
      const sub = rows[0];
      if (!sub) return fail(new DomainError("NO_ENCONTRADO", "Subetapa no encontrada"));
      if (sub.estado === "FINALIZADO") {
        return fail(new DomainError("TRANSICION_INVALIDA", "La subetapa ya está finalizada"));
      }
      if ((sub.responsable ?? "").toLowerCase() === destino) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Ese ya es el responsable actual"));
      }
      await tx.update(subetapas).set({ responsable: destino }).where(eq(subetapas.id, subetapaId));
      const motivo = input.motivo?.trim();
      const exp = await tx
        .select({ estado: expedientes.estado })
        .from(expedientes)
        .where(eq(expedientes.id, sub.expedienteId))
        .limit(1);
      const macro = exp[0]?.estado ?? null;
      await appendAuditoria(tx, {
        expedienteId: sub.expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro ?? "REGISTRADO",
        detalle: `Subetapa ${sub.etapa}.${sub.orden} derivada: ${sub.responsable ?? "—"} → ${destino}${motivo ? ` (${motivo.slice(0, 200)})` : ""}`,
      });
      return ok({
        id: sub.id,
        responsable: destino,
        expedienteId: sub.expedienteId,
        nombre: `${sub.etapa}.${sub.orden} ${sub.nombre}`,
        motivo: motivo ?? null,
      });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      expedienteId: r.value.expedienteId,
      aParticipantes: false,
      para: [r.value.responsable],
      asunto: `Se le derivó la subetapa ${r.value.nombre}`,
      titulo: "Subetapa derivada a usted",
      texto: `Se le derivó la subetapa «${r.value.nombre}».${r.value.motivo ? `\n\nMotivo: ${r.value.motivo}` : ""}`,
      textoEnlace: "Abrir el sistema",
    });
    return ok({ id: r.value.id, responsable: r.value.responsable });
  }
}
