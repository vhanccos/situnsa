import { tallerAvancesContract } from "@pis/contracts";
import { db, tallerAvances, tallerFases, usuarios } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado, esPersonal, ROL_ADMIN } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { miembrosDelTaller } from "./taller-alcance.js";
import { avancesDelTaller, matrizFases } from "./taller-avances.repository.js";
import { alcanceTaller, errorUso } from "./taller-http.js";
import {
  CrearFaseUseCase,
  filasPase,
  MarcarCumplimientoUseCase,
  RevertirPaseUseCase,
  RevisarEntregaUseCase,
  SolicitarAvanceUseCase,
  ValidarPaseUseCase,
} from "./use-cases/fases.use-cases.js";

const s = initServer();

/** P6 Agenda del asesor + P7 avances (alcance RN-07 en cada lectura). */
export function registerTallerAvancesRoutes(app: FastifyInstance): void {
  const router = s.router(tallerAvancesContract, {
    listarFases: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const miembros = await miembrosDelTaller(db, params.id);
      const { fases, matriz } = await matrizFases(db, params.id, miembros);
      // RN-06: el alumno no ve datos de otros alumnos.
      if (!esPersonal(a.perfil.roles) && !a.perfil.roles.includes("ASESOR")) {
        const dni = actor.dni;
        return {
          status: 200 as const,
          body: { fases, matriz: matriz.filter((f) => f.usuarioDni === dni) },
        };
      }
      return { status: 200 as const, body: { fases, matriz } };
    },
    crearFase: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new CrearFaseUseCase().execute(
        params.id,
        {
          nombre: body.nombre,
          ...(body.descripcion !== undefined ? { descripcion: body.descripcion } : {}),
          ...(body.fechaRef !== undefined ? { fechaRef: body.fechaRef } : {}),
        },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      return { status: 201 as const, body: r.value };
    },
    marcarCumplimiento: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const fases = await db
        .select()
        .from(tallerFases)
        .where(eq(tallerFases.id, params.id))
        .limit(1);
      const fase = fases[0];
      if (!fase)
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", "Fase no encontrada") };
      const al = await alcanceTaller(fase.tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new MarcarCumplimientoUseCase().execute(
        params.id,
        {
          usuarioDni: body.usuarioDni,
          estado: body.estado,
          ...(body.comentario !== undefined ? { comentario: body.comentario } : {}),
        },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      return { status: 200 as const, body: r.value };
    },
    listarAvances: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const propio =
        !esPersonal(a.perfil.roles) && !a.perfil.roles.includes("ASESOR") ? actor.id : undefined;
      const items = await avancesDelTaller(db, params.id, propio);
      return { status: 200 as const, body: { items } };
    },
    solicitarAvance: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new SolicitarAvanceUseCase().execute(
        params.id,
        {
          ...(body.sesionId !== undefined ? { sesionId: body.sesionId } : {}),
          descripcion: body.descripcion,
          plazo: body.plazo,
        },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      return { status: 201 as const, body: r.value.avance };
    },
    revisarEntrega: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "editar"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const avances = await db
        .select()
        .from(tallerAvances)
        .where(eq(tallerAvances.id, params.id))
        .limit(1);
      const avance = avances[0];
      if (!avance)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Avance no encontrado"),
        };
      const al = await alcanceTaller(avance.tallerId, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new RevisarEntregaUseCase().execute(
        params.id,
        {
          usuarioDni: body.usuarioDni,
          estado: body.estado,
          ...(body.observacion !== undefined ? { observacion: body.observacion } : {}),
        },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      const items = await avancesDelTaller(db, avance.tallerId);
      const entrega = items
        .find((x) => x.id === params.id)
        ?.entregas.find((e) => e.usuarioDni === body.usuarioDni);
      if (!entrega)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Entrega no encontrada"),
        };
      return { status: 200 as const, body: entrega };
    },
    pases: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const filas = await filasPase(db, params.id);
      if (esPersonal(a.perfil.roles) || a.perfil.roles.includes("ASESOR"))
        return { status: 200 as const, body: { items: filas } };
      const yo = await db.select().from(usuarios).where(eq(usuarios.id, actor.id)).limit(1);
      const dni = yo[0]?.dni;
      return { status: 200 as const, body: { items: filas.filter((f) => f.usuarioDni === dni) } };
    },
    validarPase: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["portal_asesor", "aprobar"],
        alternativas: [
          ["portal_asesor", "editar"],
          ["taller", "editar"],
        ],
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const al = await alcanceTaller(params.id, actor, a.perfil);
      if (!al.ok) return al;
      const r = await new ValidarPaseUseCase().execute(
        params.id,
        { usuarioDni: body.usuarioDni },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "REQUISITO_PENDIENTE")
          return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return errorUso(r.error);
      }
      const filas = await filasPase(db, params.id);
      const fila = filas.find((f) => f.usuarioDni === body.usuarioDni);
      if (!fila)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Alumno no encontrado"),
        };
      return { status: 200 as const, body: fila };
    },
    revertirPase: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const esAdmin = a.perfil.roles.includes(ROL_ADMIN);
      const r = await new RevertirPaseUseCase().execute(
        params.id,
        { usuarioDni: body.usuarioDni, motivo: body.motivo },
        actor,
        esAdmin,
      );
      if (!r.ok) {
        if (r.error.code === "PERMISO_DENEGADO")
          return { status: 403 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return errorUso(r.error);
      }
      const filas = await filasPase(db, params.id);
      const fila = filas.find((f) => f.usuarioDni === body.usuarioDni);
      if (!fila)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Alumno no encontrado"),
        };
      return { status: 200 as const, body: fila };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
