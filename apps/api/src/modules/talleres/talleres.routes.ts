import { asesoresContract, talleresContract } from "@pis/contracts";
import { db, talleres, usuarios } from "@pis/db";
import { DomainError, generarSesiones } from "@pis/domain";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado, esPersonal } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { miembrosDelTaller } from "./taller-alcance.js";
import { alcanceTaller } from "./taller-http.js";
import { alumnosDelTaller, detalleTaller } from "./talleres.repository.js";
import {
  CambiarAsesorUseCase,
  CancelarTallerUseCase,
  CrearTallerUseCase,
  EditarTallerUseCase,
} from "./use-cases/talleres.use-cases.js";

const s = initServer();

/** P1–P3 Talleres (staff: Secretaría/RESP_TALLER; el asesor/alumno tienen sus portales). */
export function registerTalleresRoutes(app: FastifyInstance): void {
  const router = s.router(talleresContract, {
    listar: async ({ query, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "", rol: "" };
      const filas = await db.query.talleres.findMany();
      const items = [];
      for (const t of filas) {
        // RN-07: fuera del personal, cada rol ve lo suyo (P1 vs P5/P7).
        if (!esPersonal(a.perfil.roles)) {
          if (a.perfil.roles.includes("ASESOR") && t.asesorId === actor.id) {
            /* propio */
          } else {
            const miembros = await miembrosDelTaller(db, t.id);
            if (!miembros.some((m) => m.usuarioId === actor.id)) continue;
          }
        }
        const d = await detalleTaller(db, t.id);
        if (!d) continue;
        if (query.periodo && d.periodo !== query.periodo) continue;
        if (query.estado && d.estado !== query.estado) continue;
        if (query.asesorDni && d.asesorDni !== query.asesorDni) continue;
        const { grupos: _g, ...resumen } = d;
        items.push(resumen);
      }
      return { status: 200 as const, body: { items } };
    },
    crear: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "crear"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new CrearTallerUseCase();
      const r = await uc.execute(
        {
          nombre: body.nombre,
          ...(body.periodo !== undefined ? { periodo: body.periodo } : {}),
          ...(body.asesorDni !== undefined ? { asesorDni: body.asesorDni } : {}),
          fechaInicio: body.fechaInicio,
          diasSesion: body.diasSesion,
          horaInicio: body.horaInicio,
          horaFin: body.horaFin,
          totalSesiones: body.totalSesiones,
          cupoMax: body.cupoMax,
          ...(body.enlace !== undefined ? { enlace: body.enlace } : {}),
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "DATOS_DUPLICADOS")
          return { status: 409 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const d = await detalleTaller(db, r.value.id);
      if (!d)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo crear el taller"),
        };
      return { status: 201 as const, body: d };
    },
    vistaPrevia: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "crear"] });
      if (!a.ok) return denegado(a);
      const r = generarSesiones({
        fechaInicio: body.fechaInicio,
        dias: body.diasSesion,
        horaInicio: body.horaInicio,
        horaFin: body.horaFin,
        total: body.totalSesiones,
      });
      if (!r.ok)
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      const fechas = r.value.map((x: { fecha: string }) => x.fecha);
      return {
        status: 200 as const,
        body: {
          sesiones: r.value.length,
          primera: fechas[0] ?? "",
          ultima: fechas[fechas.length - 1] ?? "",
        },
      };
    },
    detalle: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "", rol: "" };
      if (!esPersonal(a.perfil.roles)) {
        const al = await alcanceTaller(params.id, actor, a.perfil);
        if (!al.ok) return al;
      }
      const d = await detalleTaller(db, params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Taller no encontrado"),
        };
      return { status: 200 as const, body: d };
    },
    alumnos: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "", rol: "" };
      if (!esPersonal(a.perfil.roles)) {
        const al = await alcanceTaller(params.id, actor, a.perfil);
        if (!al.ok) return al;
      }
      const d = await detalleTaller(db, params.id);
      if (!d)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Taller no encontrado"),
        };
      const items = await alumnosDelTaller(db, params.id);
      // RN-06: el alumno no ve datos de otros alumnos (spec P7).
      if (!esPersonal(a.perfil.roles) && !a.perfil.roles.includes("ASESOR")) {
        return {
          status: 200 as const,
          body: { items: items.filter((f) => f.usuarioDni === actor.dni) },
        };
      }
      return { status: 200 as const, body: { items } };
    },
    editar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new EditarTallerUseCase();
      const r = await uc.execute(
        params.id,
        {
          ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
          ...(body.periodo !== undefined ? { periodo: body.periodo } : {}),
          ...(body.cupoMax !== undefined ? { cupoMax: body.cupoMax } : {}),
          ...(body.enlace !== undefined ? { enlace: body.enlace } : {}),
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value };
    },
    cambiarAsesor: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new CambiarAsesorUseCase();
      const r = await uc.execute(
        params.id,
        { asesorDni: body.asesorDni, motivo: body.motivo },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value.detalle };
    },
    cancelar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new CancelarTallerUseCase();
      const r = await uc.execute(params.id, { motivo: body.motivo }, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}

export function registerAsesoresRoutes(app: FastifyInstance): void {
  const router = s.router(asesoresContract, {
    listar: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
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
      if (!a.ok) return denegado(a);
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
      if (!a.ok) return denegado(a);
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
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
