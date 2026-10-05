import type { DbExecutor } from "@pis/db";
import { roles, usuariosRoles } from "@pis/db";
import { eq } from "drizzle-orm";

/**
 * Asigna un rol RBAC por nombre (idempotente). Los participantes creados al
 * registrar un expediente reciben TESISTA: sin él no tendrían ningún permiso
 * en su portal (denegación por defecto).
 */
export async function asignarRol(
  db: DbExecutor,
  usuarioId: string,
  nombreRol: string,
): Promise<boolean> {
  const rol = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.nombre, nombreRol))
    .limit(1);
  const rolId = rol[0]?.id;
  if (!rolId) return false;
  await db.insert(usuariosRoles).values({ usuarioId, rolId }).onConflictDoNothing();
  return true;
}
