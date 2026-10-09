import type { DbExecutor } from "@pis/db";
import { auditoriaTaller } from "@pis/db";
import { hashTransicion } from "@pis/domain";
import { and, desc, eq, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

/**
 * Historial del taller (spec §5): append-only con hash chain por taller,
 * mismo patrón que `appendAuditoria` de expedientes (candado por registro +
 * actorDni dentro del hash). La acción viaja como `nuevoEstado` del hash para
 * reutilizar `hashTransicion` sin tocar el kernel.
 */
export async function ultimoHashTaller(db: DbExecutor, tallerId: string): Promise<string | null> {
  const siguiente = alias(auditoriaTaller, "siguiente");
  const rows = await db
    .select({ hash: auditoriaTaller.hash })
    .from(auditoriaTaller)
    .where(
      and(
        eq(auditoriaTaller.tallerId, tallerId),
        notExists(
          db
            .select({ id: siguiente.id })
            .from(siguiente)
            .where(
              and(eq(siguiente.tallerId, tallerId), eq(siguiente.hashPrevio, auditoriaTaller.hash)),
            ),
        ),
      ),
    )
    .orderBy(desc(auditoriaTaller.createdAt))
    .limit(1);
  return rows[0]?.hash ?? null;
}

export async function appendAuditoriaTaller(
  db: DbExecutor,
  input: {
    tallerId: string;
    actorId: string | null;
    actorDni: string;
    accion: string;
    detalle?: string;
  },
): Promise<void> {
  await db.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`auditoria-taller:${input.tallerId}`}))`,
  );
  const previo = await ultimoHashTaller(db, input.tallerId);
  const timestamp = new Date().toISOString();
  const hash = hashTransicion({
    hashPrevio: previo,
    expedienteId: input.tallerId,
    actor: input.actorDni,
    nuevoEstado: input.accion,
    timestamp,
  });
  await db.insert(auditoriaTaller).values({
    tallerId: input.tallerId,
    actorId: input.actorId,
    actorDni: input.actorDni,
    accion: input.accion,
    detalle: input.detalle ?? null,
    hashPrevio: previo,
    hash,
    createdAt: new Date(timestamp),
  });
}
