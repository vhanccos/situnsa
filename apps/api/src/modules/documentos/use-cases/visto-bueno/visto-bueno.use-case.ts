import { db, documentos, expedientes } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { appendAuditoria } from "../../../expedientes/expedientes.auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * V°B° académico del documento (RN-08): CARGADO/OBSERVADO → APROBADO
 * (aprobado=true) o → OBSERVADO (aprobado=false, exige comentario).
 * No cierra subetapas: eso lo hace FinalizarSubetapa (responsable).
 * Se audita en la cadena del expediente como pronunciamiento delegado.
 */
export class VistoBuenoDocumentoUseCase {
  async execute(
    documentoId: string,
    input: { aprobado: boolean; comentario?: string },
    actor: Actor,
  ): Promise<Result<{ id: string; estado: string; version: number }, DomainError>> {
    if (!input.aprobado && !(input.comentario ?? "").trim()) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "Observar exige un comentario para el tesista"),
      );
    }
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const rows = await tx
        .select()
        .from(documentos)
        .where(eq(documentos.id, documentoId))
        .limit(1);
      const doc = rows[0];
      if (!doc) return fail(new DomainError("NO_ENCONTRADO", "Documento no encontrado"));
      if (doc.estado !== "CARGADO" && doc.estado !== "OBSERVADO") {
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            `Solo se puede visar un documento CARGADO u OBSERVADO (actual: ${doc.estado})`,
          ),
        );
      }
      const nuevo = input.aprobado ? "APROBADO" : "OBSERVADO";
      await tx.update(documentos).set({ estado: nuevo }).where(eq(documentos.id, documentoId));
      const expRows = await tx
        .select({ estado: expedientes.estado })
        .from(expedientes)
        .where(eq(expedientes.id, doc.expedienteId))
        .limit(1);
      const macro = expRows[0]?.estado ?? "REGISTRADO";
      await appendAuditoria(tx, {
        expedienteId: doc.expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro,
        detalle: input.aprobado
          ? `V°B° ${doc.tipo} v${doc.version}`
          : `Observado ${doc.tipo} v${doc.version}: ${(input.comentario ?? "").trim().slice(0, 200)}`,
      });
      return ok({ id: doc.id, estado: nuevo, version: doc.version });
    });
  }
}
