import { authContract } from "@pis/contracts";
import { db, usuarios } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

const s = initServer();

/**
 * §3 Login (stub dev): verifica identidad por DNI/CUI/correo.
 * Fase 2: Better-Auth con hash + Google @unsa.edu.pe.
 */
export function registerAuthRoutes(app: FastifyInstance): void {
  const router = s.router(authContract, {
    loginLocal: async ({ body }) => {
      if (!body.password)
        return { status: 401 as const, body: { message: "Credenciales inválidas" } };
      const rows = await db
        .select()
        .from(usuarios)
        .where(
          or(
            eq(usuarios.dni, body.identificador),
            eq(usuarios.cui, body.identificador),
            eq(usuarios.email, body.identificador),
          ),
        )
        .limit(1);
      const u = rows[0];
      if (!u || !u.activo) {
        return {
          status: 401 as const,
          body: { message: "Credenciales inválidas o usuario inactivo" },
        };
      }
      return {
        status: 200 as const,
        body: {
          userId: u.id,
          dni: u.dni,
          nombres: `${u.nombres} ${u.apellidos}`,
          email: u.email,
          rol: u.rol,
        },
      };
    },
    sesion: async ({ request }) => {
      const header = request.headers["x-user-dni"];
      const dni = (Array.isArray(header) ? header[0] : header) ?? null;
      if (!dni) return { status: 401 as const, body: { message: "Sin sesión" } };
      const rows = await db.select().from(usuarios).where(eq(usuarios.dni, dni)).limit(1);
      const u = rows[0];
      if (!u) return { status: 401 as const, body: { message: "Sin sesión" } };
      return {
        status: 200 as const,
        body: {
          userId: u.id,
          dni: u.dni,
          nombres: `${u.nombres} ${u.apellidos}`,
          email: u.email,
          rol: u.rol,
        },
      };
    },
  });
  app.register(s.plugin(router));
}
