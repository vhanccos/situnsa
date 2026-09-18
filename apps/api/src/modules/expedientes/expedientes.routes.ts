import { expedientesContract } from "@pis/contracts";
import { initServer } from "@ts-rest/fastify";
import type { FastifyInstance } from "fastify";
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
    getById: async ({ params }) => ({
      status: 404 as const,
      body: { message: `Expediente ${params.id} no encontrado (skeleton)` },
    }),
    listar: async () => ({ status: 200 as const, body: { items: [], total: 0 } }),
  });
  app.register(s.plugin(router));
}
