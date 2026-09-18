import { expedientesContract } from "@pis/contracts";
import { db } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import type { FastifyInstance } from "fastify";
import { stubAuth } from "../../middleware/stub-auth.js";
import { getDetalleById } from "./expedientes.repository.js";
import { ActualizarDatosUseCase } from "./use-cases/actualizar-datos/actualizar-datos.use-case.js";
import { InscribirPlanUseCase } from "./use-cases/inscribir-plan/inscribir-plan.use-case.js";

const s = initServer();

export function registerExpedientesRoutes(app: FastifyInstance): void {
  const router = s.router(expedientesContract, {
    inscribirPlan: async ({ body }) => {
      const uc = new InscribirPlanUseCase();
      const r = await uc.execute(body);
      if (!r.ok)
        return { status: 400 as const, body: { message: r.error.message, code: r.error.code } };
      return {
        status: 201 as const,
        body: {
          id: r.value.id,
          codigo: r.value.codigo,
          estado: "REGISTRADO" as const,
          modalidad: body.modalidad,
          programa: body.programa,
          titulo: "Expediente creado (skeleton)",
        },
      };
    },
    getById: async ({ params }) => {
      const detalle = await getDetalleById(db, params.id);
      if (!detalle) return { status: 404 as const, body: { message: "Expediente no encontrado" } };
      return { status: 200 as const, body: detalle };
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
      return { status: 200 as const, body: r.value };
    },
    listar: async () => ({ status: 200 as const, body: { items: [], total: 0 } }),
  });
  // Stub-auth en Fase 1 para todo el módulo (lecturas con actor default en dev).
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", stubAuth);
    scoped.register(s.plugin(router));
  });
}
