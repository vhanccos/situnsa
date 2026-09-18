import { seguridadContract } from "@pis/contracts";
import { db, permisos, roles, rolesPermisos } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";

const s = initServer();

async function rolConPermisos(rolId: string) {
  const r = await db.select().from(roles).where(eq(roles.id, rolId)).limit(1);
  const rol = r[0];
  if (!rol) return null;
  const grants = await db
    .select({ clave: permisos.clave })
    .from(rolesPermisos)
    .innerJoin(permisos, eq(permisos.id, rolesPermisos.permisoId))
    .where(eq(rolesPermisos.rolId, rolId));
  return {
    id: rol.id,
    nombre: rol.nombre,
    descripcion: rol.descripcion,
    esSistema: rol.esSistema,
    activo: rol.activo,
    permisos: grants.map((g) => g.clave),
  };
}

/** RBAC administrable (S-FIPS): roles + permisos `modulo.accion` + PUT de grants. */
export function registerSeguridadRoutes(app: FastifyInstance): void {
  const router = s.router(seguridadContract, {
    listarRoles: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const todos = await db.select({ id: roles.id }).from(roles);
      const items: Array<NonNullable<Awaited<ReturnType<typeof rolConPermisos>>>> = [];
      for (const t of todos) {
        const dto = await rolConPermisos(t.id);
        if (dto) items.push(dto);
      }
      return { status: 200 as const, body: { items } };
    },
    listarPermisos: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const rows = await db.select().from(permisos);
      return {
        status: 200 as const,
        body: {
          items: rows.map((p) => ({
            id: p.id,
            modulo: p.modulo,
            accion: p.accion,
            clave: p.clave,
          })),
        },
      };
    },
    actualizarPermisos: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actual = await db.select().from(roles).where(eq(roles.id, params.id)).limit(1);
      const rol = actual[0];
      if (!rol)
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", "Rol no encontrado") };
      if (rol.nombre === "ADMIN_SISTEMA") {
        return {
          status: 400 as const,
          body: errorEnvelope(
            "VALIDACION_FALLIDA",
            "ADMIN_SISTEMA tiene todo implícito: no admite grants editables",
          ),
        };
      }
      const validos = await db
        .select({ id: permisos.id })
        .from(permisos)
        .where(
          inArray(
            permisos.id,
            body.permisoIds.length > 0 ? body.permisoIds : ["00000000-0000-0000-0000-000000000000"],
          ),
        );
      const idsValidos = new Set(validos.map((p) => p.id));
      const desconocidos = body.permisoIds.filter((id) => !idsValidos.has(id));
      if (desconocidos.length > 0) {
        return {
          status: 400 as const,
          body: errorEnvelope(
            "VALIDACION_FALLIDA",
            `${desconocidos.length} permiso(s) desconocido(s)`,
          ),
        };
      }
      await db.transaction(async (tx) => {
        await tx.delete(rolesPermisos).where(eq(rolesPermisos.rolId, params.id));
        for (const pid of body.permisoIds) {
          await tx.insert(rolesPermisos).values({ rolId: params.id, permisoId: pid });
        }
      });
      const dto = await rolConPermisos(params.id);
      if (!dto)
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", "Rol no encontrado") };
      return { status: 200 as const, body: dto };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}
