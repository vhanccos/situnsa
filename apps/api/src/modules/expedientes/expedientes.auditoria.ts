import type { DbExecutor } from "@pis/db";
import { auditoriaTransiciones } from "@pis/db";
import { hashTransicion } from "@pis/domain";
import { and, desc, eq, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

/**
 * Último eslabón de la cadena de custodia (null = GENESIS): el evento al que
 * ningún otro enlaza. No depende de `created_at`, que puede empatar al
 * milisegundo; en una cadena lineal hay exactamente uno.
 */
export async function ultimoHash(db: DbExecutor, expedienteId: string): Promise<string | null> {
  const siguiente = alias(auditoriaTransiciones, "siguiente");
  const rows = await db
    .select({ hash: auditoriaTransiciones.hash })
    .from(auditoriaTransiciones)
    .where(
      and(
        eq(auditoriaTransiciones.expedienteId, expedienteId),
        notExists(
          db
            .select({ id: siguiente.id })
            .from(siguiente)
            .where(
              and(
                eq(siguiente.expedienteId, expedienteId),
                eq(siguiente.hashPrevio, auditoriaTransiciones.hash),
              ),
            ),
        ),
      ),
    )
    .orderBy(desc(auditoriaTransiciones.createdAt))
    .limit(1);
  return rows[0]?.hash ?? null;
}

/**
 * Append-only: registra el evento en la cadena SHA-256 (mismo COMMIT del UoW).
 * El candado transaccional por expediente serializa los appends concurrentes
 * para que la cadena no se bifurque (dos eventos con el mismo hash previo).
 */
export async function appendAuditoria(
  db: DbExecutor,
  input: {
    expedienteId: string;
    actorId: string | null;
    actorDni: string;
    estadoAnterior: string | null;
    estadoNuevo: string;
    detalle?: string;
  },
): Promise<void> {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`auditoria:${input.expedienteId}`}))`,
  );
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
    actorDni: input.actorDni,
    estadoAnterior: input.estadoAnterior,
    estadoNuevo: input.estadoNuevo,
    hashPrevio: previo,
    hash,
    detalle: input.detalle ?? null,
    createdAt: new Date(timestamp),
  });
}
