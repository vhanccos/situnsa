import { sesionesContract } from "@pis/contracts";
import { db, tallerAsistencias, tallerSesiones, usuarios } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado, esPersonal } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { alcanceTaller, errorUso } from "./taller-http.js";
import {
  AbrirAsistenciaUseCase,
  CancelarSesionUseCase,
  CerrarAsistenciaUseCase,
  CorregirAsistenciaUseCase,
  MarcarAsistenciaUseCase,
  ReprogramarSesionUseCase,
} from "./use-cases/sesiones.use-cases.js";

const s = initServer();

async function dtoSesion(sesionId: string) {
  const filas = await db
    .select()
    .from(tallerSesiones)
    .where(eq(tallerSesiones.id, sesionId))
    .limit(1);
  const row = filas[0];
  if (!row) return null;
  const marcas = await db
    .select({ estado: tallerAsistencias.estado })
    .from(tallerAsistencias)
    .where(eq(tallerAsistencias.sesionId, sesionId));
  return {
    id: row.id,
    tallerId: row.tallerId,
    nro: row.nro,
    fecha: row.fecha,
    horaInicio: row.horaInicio,
    horaFin: row.horaFin,
    estado: row.estado,
    motivo: row.motivo,
    presentes: marcas.filter((m) => m.estado === "PRESENTE").length,
    total: marcas.length,
  };
}

/** P4 Sesiones y asistencia + P7 marcar (el servidor revalida alcance). */
export function registerSesionesRoutes(app: FastifyInstance): void {
  const router = s.router(sesionesContract, {
    listar: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const al = await alcanceTaller(params.id, request.actor ?? { id: "", dni: "" }, a.perfil);
      if (!al.ok) return al;
      const filas = await db
        .select()
        .from(tallerSesiones)
        .where(eq(tallerSesiones.tallerId, params.id));
      const items = [];
      for (const f of filas) {
        const d = await dtoSesion(f.id);
        if (d) items.push(d);
      }
      items.sort((x, y) => x.nro - y.nro);
      return { status: 200 as const, body: { items } };
    },
    verAsistencia: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const sesion = await dtoSesion(params.id);
      if (!sesion)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(
        sesion.tallerId,
        request.actor ?? { id: "", dni: "" },
        a.perfil,
      );
      if (!al.ok) return al;
      const marcas = await db
        .select()
        .from(tallerAsistencias)
        .where(eq(tallerAsistencias.sesionId, params.id));
      const propias =
        !esPersonal(a.perfil.roles) && !a.perfil.roles.includes("ASESOR")
          ? marcas.filter((m) => m.usuarioId === (request.actor?.id ?? ""))
          : marcas;
      const gente = await db
        .select({
          id: usuarios.id,
          dni: usuarios.dni,
          nombres: usuarios.nombres,
          apellidos: usuarios.apellidos,
        })
        .from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u]));
      return {
        status: 200 as const,
        body: {
          sesion,
          items: propias.map((m) => {
            const u = porId.get(m.usuarioId);
            return {
              usuarioDni: u?.dni ?? "—",
              nombres: u ? `${u.nombres} ${u.apellidos}` : "—",
              estado: m.estado,
              marcadaAt: m.marcadaAt?.toISOString() ?? null,
              motivo: m.motivo,
            };
          }),
        },
      };
    },
    abrir: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const previas = await db
        .select({ tallerId: tallerSesiones.tallerId })
        .from(tallerSesiones)
        .where(eq(tallerSesiones.id, params.id))
        .limit(1);
      const tallerId = previas[0]?.tallerId;
      if (!tallerId)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new AbrirAsistenciaUseCase().execute(params.id, actor);
      if (!r.ok) return errorUso(r.error);
      const d = await dtoSesion(params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      return { status: 200 as const, body: d };
    },
    cerrar: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const previas = await db
        .select({ tallerId: tallerSesiones.tallerId })
        .from(tallerSesiones)
        .where(eq(tallerSesiones.id, params.id))
        .limit(1);
      const tallerId = previas[0]?.tallerId;
      if (!tallerId)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new CerrarAsistenciaUseCase().execute(params.id, actor);
      if (!r.ok) return errorUso(r.error);
      const d = await dtoSesion(params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      return { status: 200 as const, body: d };
    },
    reprogramar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const previas = await db
        .select({ tallerId: tallerSesiones.tallerId })
        .from(tallerSesiones)
        .where(eq(tallerSesiones.id, params.id))
        .limit(1);
      const tallerId = previas[0]?.tallerId;
      if (!tallerId)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new ReprogramarSesionUseCase().execute(
        params.id,
        {
          fecha: body.fecha,
          ...(body.horaInicio !== undefined ? { horaInicio: body.horaInicio } : {}),
          ...(body.horaFin !== undefined ? { horaFin: body.horaFin } : {}),
          motivo: body.motivo,
        },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      const d = await dtoSesion(params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      return { status: 200 as const, body: d };
    },
    cancelar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const previas = await db
        .select({ tallerId: tallerSesiones.tallerId })
        .from(tallerSesiones)
        .where(eq(tallerSesiones.id, params.id))
        .limit(1);
      const tallerId = previas[0]?.tallerId;
      if (!tallerId)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new CancelarSesionUseCase().execute(
        params.id,
        { motivo: body.motivo },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      const d = await dtoSesion(params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      return { status: 200 as const, body: d };
    },
    marcar: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_alumno", "crear"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new MarcarAsistenciaUseCase().execute(params.id, actor.id, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        if (r.error.code === "FUERA_DE_ALCANCE")
          return { status: 403 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value };
    },
    corregir: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const previas = await db
        .select({ tallerId: tallerSesiones.tallerId })
        .from(tallerSesiones)
        .where(eq(tallerSesiones.id, params.id))
        .limit(1);
      const tallerId = previas[0]?.tallerId;
      if (!tallerId)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Sesión no encontrada"),
        };
      const al = await alcanceTaller(tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new CorregirAsistenciaUseCase().execute(
        params.id,
        { usuarioDni: body.usuarioDni, estado: body.estado, motivo: body.motivo },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      const gente = await db
        .select({
          id: usuarios.id,
          dni: usuarios.dni,
          nombres: usuarios.nombres,
          apellidos: usuarios.apellidos,
        })
        .from(usuarios)
        .where(eq(usuarios.dni, body.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Asistencia no encontrada"),
        };
      const ver = await db
        .select()
        .from(tallerAsistencias)
        .where(
          and(eq(tallerAsistencias.sesionId, params.id), eq(tallerAsistencias.usuarioId, u.id)),
        )
        .limit(1);
      const fila = ver[0];
      if (!fila)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Asistencia no encontrada"),
        };
      return {
        status: 200 as const,
        body: {
          usuarioDni: u.dni,
          nombres: `${u.nombres} ${u.apellidos}`,
          estado: fila.estado,
          marcadaAt: fila.marcadaAt?.toISOString() ?? null,
          motivo: fila.motivo,
        },
      };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
