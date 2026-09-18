import { db, usuarios } from "@pis/db";
import { eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface StubActor {
  id: string;
  dni: string;
  rol: string;
}

/**
 * Stub de autenticación SOLO dev (AUTH_STUB=1).
 * Lee `x-user-dni` (default: tesista de prueba 12345678) y adjunta el actor.
 * Producción: requireAuth con Bearer JWT (middleware/require-auth.ts).
 */
export async function stubAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers["x-user-dni"];
  const dni = (Array.isArray(header) ? header[0] : header) ?? "12345678";
  const rows = await db
    .select({ id: usuarios.id, dni: usuarios.dni, rol: usuarios.rol })
    .from(usuarios)
    .where(or(eq(usuarios.dni, dni), eq(usuarios.email, dni)))
    .limit(1);
  const user = rows[0];
  if (!user) {
    reply.status(401).send({ message: `Usuario desconocido (x-user-dni=${dni})` });
    return;
  }
  req.actor = { id: user.id, dni: user.dni, rol: user.rol };
}
