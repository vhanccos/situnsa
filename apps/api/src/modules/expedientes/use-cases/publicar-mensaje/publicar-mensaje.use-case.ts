import { db, expedientes, mensajes } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";

export interface Actor {
  id: string;
  dni: string;
}

/** Mensaje administrativo visible en Mi Trámite (§5). */
export class PublicarMensajeUseCase {
  async execute(
    expedienteId: string,
    texto: string,
    actor: Actor,
  ): Promise<
    Result<{ id: string; texto: string; autorDni: string; createdAt: string }, DomainError>
  > {
    const clean = texto.trim();
    if (clean.length < 2) return fail(new DomainError("VALIDACION_FALLIDA", "Mensaje vacío"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const exp = await tx
        .select({ id: expedientes.id })
        .from(expedientes)
        .where(eq(expedientes.id, expedienteId))
        .limit(1);
      if (!exp[0]) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      const inserted = await tx
        .insert(mensajes)
        .values({ expedienteId, autorId: actor.id, texto: clean })
        .returning({ id: mensajes.id, createdAt: mensajes.createdAt });
      const row = inserted[0];
      if (!row?.createdAt)
        return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo publicar"));
      return ok({
        id: row.id,
        texto: clean,
        autorDni: actor.dni,
        createdAt: row.createdAt.toISOString(),
      });
    });
  }
}
