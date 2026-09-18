import { asesoresContract, talleresContract } from "@pis/contracts";
import { db, talleres, usuarios } from "@pis/db";
import { DomainError } from "@pis/domain";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";

const s = initServer();

export function registerTalleresRoutes(app: FastifyInstance): void {
  const router = s.router(talleresContract, {
    listar: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const rows = await db.select().from(talleres);
      const gente = await db.select().from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, `${u.nombres} ${u.apellidos}`]));
      return {
        status: 200 as const,
        body: {
          items: rows.map((t) => ({
            id: t.id,
            nombre: t.nombre,
            asesorNombre: t.asesorId ? (porId.get(t.asesorId) ?? null) : null,
            periodo: t.periodo,
            estado: t.estado,
            inscritos: t.inscritos,
          })),
        },
      };
    },
    crear: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "crear"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      let asesorId: string | null = null;
      if (body.asesorDni) {
        const rows = await db
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(eq(usuarios.dni, body.asesorDni))
          .limit(1);
        if (!rows[0])
          return {
            status: 400 as const,
            body: errorEnvelope("VALIDACION_FALLIDA", `Asesor DNI ${body.asesorDni} no existe`),
          };
        asesorId = rows[0].id;
      }
      const inserted = await db
        .insert(talleres)
        .values({ nombre: body.nombre, asesorId, periodo: body.periodo ?? null })
        .returning();
      const t = inserted[0];
      if (!t)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo crear el taller"),
        };
      return {
        status: 201 as const,
        body: {
          id: t.id,
          nombre: t.nombre,
          asesorNombre: null,
          periodo: t.periodo,
          estado: t.estado,
          inscritos: t.inscritos,
        },
      };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}

export function registerAsesoresRoutes(app: FastifyInstance): void {
  const router = s.router(asesoresContract, {
    listar: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const rows = await db.select().from(usuarios).where(eq(usuarios.rol, "ASESOR"));
      const talls = await db.select().from(talleres);
      return {
        status: 200 as const,
        body: {
          items: rows.map((u) => ({
            id: u.id,
            dni: u.dni,
            nombres: u.nombres,
            apellidos: u.apellidos,
            email: u.email,
            telefono: u.telefono,
            grado: u.grado,
            activo: u.activo,
            talleres: talls.filter((t) => t.asesorId === u.id).length,
          })),
        },
      };
    },
    crear: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "crear"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      try {
        const inserted = await db
          .insert(usuarios)
          .values({
            ...body,
            telefono: body.telefono ?? null,
            grado: body.grado ?? null,
            rol: "ASESOR",
          })
          .returning();
        const u = inserted[0];
        if (!u)
          return {
            status: 400 as const,
            body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo crear el asesor"),
          };
        return {
          status: 201 as const,
          body: {
            id: u.id,
            dni: u.dni,
            nombres: u.nombres,
            apellidos: u.apellidos,
            email: u.email,
            telefono: u.telefono,
            grado: u.grado,
            activo: u.activo,
            talleres: 0,
          },
        };
      } catch {
        throw new DomainError("VALIDACION_FALLIDA", "DNI o correo duplicado");
      }
    },
    cambiarEstado: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      await db.update(usuarios).set({ activo: body.activo }).where(eq(usuarios.id, params.id));
      const rows = await db.select().from(usuarios).where(eq(usuarios.id, params.id)).limit(1);
      const u = rows[0];
      if (!u)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Asesor no encontrado"),
        };
      const talls = await db.select().from(talleres);
      return {
        status: 200 as const,
        body: {
          id: u.id,
          dni: u.dni,
          nombres: u.nombres,
          apellidos: u.apellidos,
          email: u.email,
          telefono: u.telefono,
          grado: u.grado,
          activo: u.activo,
          talleres: talls.filter((t) => t.asesorId === u.id).length,
        },
      };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}
