import { db, idempotencyKeys } from "@pis/db";
import { eq, lt } from "drizzle-orm";

const TTL_MS = 24 * 60 * 60 * 1000;

/** Respuesta almacenada de una clave ya ejecutada (replay sin re-ejecutar). */
export async function buscarRespuesta(
  clave: string,
): Promise<{ estado: number; respuesta: unknown } | null> {
  await db.delete(idempotencyKeys).where(lt(idempotencyKeys.expiraAt, new Date()));
  const rows = await db
    .select({
      estado: idempotencyKeys.estado,
      respuesta: idempotencyKeys.respuesta,
    })
    .from(idempotencyKeys)
    .where(eq(idempotencyKeys.clave, clave))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { estado: Number(row.estado), respuesta: row.respuesta };
}

/** Guarda la respuesta original para replays dentro de 24h. */
export async function guardarRespuesta(
  clave: string,
  metodo: string,
  ruta: string,
  estado: number,
  respuesta: unknown,
): Promise<void> {
  await db
    .insert(idempotencyKeys)
    .values({
      clave,
      metodo,
      ruta,
      respuesta: respuesta as Record<string, unknown>,
      estado: String(estado),
      expiraAt: new Date(Date.now() + TTL_MS),
    })
    .onConflictDoNothing({ target: idempotencyKeys.clave });
}

/** Lee la clave del cliente (solo se honra en creaciones críticas). */
export function leerClave(headers: Record<string, string | string[] | undefined>): string | null {
  const v = headers["idempotency-key"];
  const clave = Array.isArray(v) ? v[0] : v;
  if (!clave || !/^[A-Za-z0-9_-]{8,64}$/.test(clave)) return null;
  return clave;
}
