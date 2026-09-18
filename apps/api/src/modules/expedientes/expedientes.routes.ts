import { ExpedienteDetalleDTOSchema, expedientesContract } from "@pis/contracts";
import { db } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import type { FastifyInstance } from "fastify";
import { errorEnvelope } from "../../infra/http/errores.js";
import { buscarRespuesta, guardarRespuesta, leerClave } from "../../infra/http/idempotencia.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { getDetalleById, listarExpedientes } from "./expedientes.repository.js";
import { ActualizarDatosUseCase } from "./use-cases/actualizar-datos/actualizar-datos.use-case.js";
import { AnularExpedienteUseCase } from "./use-cases/anular-expediente/anular-expediente.use-case.js";
import { InscribirPlanUseCase } from "./use-cases/inscribir-plan/inscribir-plan.use-case.js";
import { PublicarMensajeUseCase } from "./use-cases/publicar-mensaje/publicar-mensaje.use-case.js";
import { ValidarInscripcionUseCase } from "./use-cases/validar-inscripcion/validar-inscripcion.use-case.js";

const s = initServer();

export function registerExpedientesRoutes(app: FastifyInstance): void {
  const router = s.router(expedientesContract, {
    inscribirPlan: async ({ body, request }) => {
      const clave = leerClave(request.headers);
      if (clave) {
        const previa = await buscarRespuesta(clave);
        if (previa?.respuesta && typeof previa.respuesta === "object") {
          const replay = previa.respuesta as { id: string; codigo: string };
          if (typeof replay.id === "string" && typeof replay.codigo === "string") {
            return { status: 201 as const, body: replay };
          }
        }
      }
      const uc = new InscribirPlanUseCase();
      const r = await uc.execute(body);
      if (!r.ok)
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      if (clave) {
        await guardarRespuesta(clave, "POST", "/api/expedientes/inscribir-plan", 201, r.value);
      }
      return { status: 201 as const, body: r.value };
    },
    validar: async ({ params, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ValidarInscripcionUseCase();
      const r = await uc.execute(params.id, actor);
      if (!r.ok) {
        if (r.error.code === "TRANSICION_INVALIDA") {
          return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
        }
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", r.error.message) };
      }
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(r.value.detalle) };
    },
    publicarMensaje: async ({ params, body, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new PublicarMensajeUseCase();
      const r = await uc.execute(params.id, body.texto, actor);
      if (!r.ok)
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", r.error.message) };
      return { status: 201 as const, body: r.value };
    },
    anular: async ({ params, body, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new AnularExpedienteUseCase();
      const r = await uc.execute(params.id, body.motivo, actor);
      if (!r.ok && r.error.code === "TRANSICION_INVALIDA") {
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      if (!r.ok)
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", r.error.message) };
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(r.value) };
    },
    getById: async ({ params }) => {
      const detalle = await getDetalleById(db, params.id);
      if (!detalle)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Expediente no encontrado"),
        };
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(detalle) };
    },
    actualizarDatos: async ({ params, body, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ActualizarDatosUseCase();
      const r = await uc.execute(params.id, body, actor);
      if (!r.ok && r.error.code === "CONFLICTO_CONCURRENCIA") {
        const actual = await getDetalleById(db, params.id);
        return {
          status: 409 as const,
          body: {
            ...errorEnvelope(r.error.code, r.error.message),
            updatedAt: actual?.updatedAt ?? new Date().toISOString(),
          },
        };
      }
      if (!r.ok && r.error.message === "Expediente no encontrado") {
        return { status: 404 as const, body: errorEnvelope("NO_ENCONTRADO", r.error.message) };
      }
      if (!r.ok)
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(r.value) };
    },
    listar: async ({ query, request }) => {
      const r = await listarExpedientes(db, {
        q: query.q,
        estado: query.estado,
        orden: query.orden,
        vista: query.vista,
        page: query.page,
        limit: query.limit,
        actorDni: request.actor?.dni,
        actorRol: request.actor?.rol,
      });
      return { status: 200 as const, body: r };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}
