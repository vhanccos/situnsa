import type { Db } from "@pis/db";
import { auditoriaTransiciones } from "@pis/db";
import { hashTransicion } from "@pis/domain";
import { desc, eq } from "drizzle-orm";

/** Último hash de la cadena de custodia del expediente (GENESIS si no hay). */
export async function ultimoHash(db: Db, expedienteId: string): Promise<string | null> {
  const rows = await db
    .select({ hash: auditoriaTransiciones.hash })
    .from(auditoriaTransiciones)
    .where(eq(auditoriaTransiciones.expedienteId, expedienteId))
    .orderBy(desc(auditoriaTransiciones.createdAt))
    .limit(1);
  return rows[0]?.hash ?? null;
}

/** Append-only: registra el evento en la cadena SHA-256 (mismo COMMIT del UoW). */
export async function appendAuditoria(
  db: Db,
  input: {
    expedienteId: string;
    actorId: string | null;
    actorDni: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    detalle?: string;
  },
): Promise<void> {
  const previo = await ultimoHash(db, input.expedienteId);
  const timestamp = new Date().toISOString();
  const hash = hashTransicion({
    hashPrevio: previo,
    expedienteId: input.expedienteId,
    actor: input.actorDni,
    nuevoEstado: input.estadoNuevo,
    timestamp,
  });
  await db.insert(auditoriaTransiciones).values({
    expedienteId: input.expedienteId,
    actorId: input.actorId,
    estadoAnterior: input.estadoAnterior,
    estadoNuevo: input.estadoNuevo,
    hashPrevio: previo,
    hash,
    detalle: input.detalle ?? null,
  });
}
