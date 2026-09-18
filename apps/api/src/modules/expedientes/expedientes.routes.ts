import { ExpedienteDetalleDTOSchema, expedientesContract } from "@pis/contracts";
import { db } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import type { FastifyInstance } from "fastify";
import { stubAuth } from "../../middleware/stub-auth.js";
import { getDetalleById, listarExpedientes } from "./expedientes.repository.js";
import { ActualizarDatosUseCase } from "./use-cases/actualizar-datos/actualizar-datos.use-case.js";
import { InscribirPlanUseCase } from "./use-cases/inscribir-plan/inscribir-plan.use-case.js";
import { PublicarMensajeUseCase } from "./use-cases/publicar-mensaje/publicar-mensaje.use-case.js";
import { ValidarInscripcionUseCase } from "./use-cases/validar-inscripcion/validar-inscripcion.use-case.js";

const s = initServer();

export function registerExpedientesRoutes(app: FastifyInstance): void {
  const router = s.router(expedientesContract, {
    inscribirPlan: async ({ body }) => {
      const uc = new InscribirPlanUseCase();
      const r = await uc.execute(body);
      if (!r.ok)
        return { status: 400 as const, body: { message: r.error.message, code: r.error.code } };
      return { status: 201 as const, body: r.value };
    },
    validar: async ({ params, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ValidarInscripcionUseCase();
      const r = await uc.execute(params.id, actor);
      if (!r.ok) {
        const code = r.error.code === "TRANSICION_INVALIDA" ? (400 as const) : (404 as const);
        if (code === 400)
          return { status: code, body: { message: r.error.message, code: r.error.code } };
        return { status: code, body: { message: r.error.message } };
      }
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(r.value.detalle) };
    },
    publicarMensaje: async ({ params, body, request }) => {
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new PublicarMensajeUseCase();
      const r = await uc.execute(params.id, body.texto, actor);
      if (!r.ok) return { status: 404 as const, body: { message: r.error.message } };
      return { status: 201 as const, body: r.value };
    },
    getById: async ({ params }) => {
      const detalle = await getDetalleById(db, params.id);
      if (!detalle) return { status: 404 as const, body: { message: "Expediente no encontrado" } };
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
            message: r.error.message,
            updatedAt: actual?.updatedAt ?? new Date().toISOString(),
          },
        };
      }
      if (!r.ok) return { status: 404 as const, body: { message: r.error.message } };
      return { status: 200 as const, body: ExpedienteDetalleDTOSchema.parse(r.value) };
    },
    listar: async ({ query }) => {
      const r = await listarExpedientes(db, {
        q: query.q,
        estado: query.estado,
        orden: query.orden,
      });
      return { status: 200 as const, body: r };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", stubAuth);
    scoped.register(s.plugin(router));
  });
}
