import { seguimientoContract } from "@pis/contracts";
import { db, subetapas } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado } from "../../infra/auth/autorizacion.js";
import { errorEnvelope, respuestaError } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { getDetalleById } from "../expedientes/expedientes.repository.js";
import { ObservarExpedienteUseCase } from "../expedientes/use-cases/observar-expediente/observar-expediente.use-case.js";
import { DerivarSubetapaUseCase } from "./use-cases/derivar-subetapa.use-case.js";
import { FinalizarSubetapaUseCase } from "./use-cases/finalizar-subetapa.use-case.js";

const s = initServer();

async function expedienteDeSubetapa(subetapaId: string): Promise<string | null> {
  const rows = await db
    .select({ expedienteId: subetapas.expedienteId })
    .from(subetapas)
    .where(eq(subetapas.id, subetapaId))
    .limit(1);
  return rows[0]?.expedienteId ?? null;
}

/** Operación del proceso: observar, finalizar/derivar subetapas, seguimiento, historial. */
export function registerSeguimientoRoutes(app: FastifyInstance): void {
  const router = s.router(seguimientoContract, {
    observar: async ({ params, body, request }) => {
      // Inscripción (validador del taller) o cualquier etapa (responsables).
      const a = await autorizar(request.actor, {
        permiso: ["seguimiento", "editar"],
        alternativas: [["inscripciones", "aprobar"]],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new ObservarExpedienteUseCase().execute(params.id, body.motivo, actor);
      if (!r.ok) return respuestaError(r.error);
      return { status: 200 as const, body: r.value };
    },
    finalizarSubetapa: async ({ params, request }) => {
      // RN-08: solo el responsable (permiso de cierre) finaliza subetapas.
      const expedienteId = await expedienteDeSubetapa(params.id);
      if (!expedienteId) {
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Subetapa no encontrada"),
        };
      }
      const a = await autorizar(request.actor, {
        permiso: ["seguimiento", "aprobar"],
        expedienteId,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new FinalizarSubetapaUseCase().execute(params.id, actor);
      if (!r.ok) return respuestaError(r.error);
      return { status: 200 as const, body: r.value };
    },
    derivarSubetapa: async ({ params, body, request }) => {
      const expedienteId = await expedienteDeSubetapa(params.id);
      if (!expedienteId) {
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Subetapa no encontrada"),
        };
      }
      const a = await autorizar(request.actor, {
        permiso: ["seguimiento", "editar"],
        expedienteId,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new DerivarSubetapaUseCase().execute(
        params.id,
        body.motivo !== undefined
          ? { responsable: body.responsable, motivo: body.motivo }
          : { responsable: body.responsable },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      return { status: 200 as const, body: r.value };
    },
    seguimiento: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["seguimiento", "ver"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const detalle = await getDetalleById(db, params.id);
      if (!detalle)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Expediente no encontrado"),
        };
      return {
        status: 200 as const,
        body: { expedienteId: detalle.id, avance: detalle.avance, subetapas: detalle.subetapas },
      };
    },
    historial: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["auditoria", "ver"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const detalle = await getDetalleById(db, params.id);
      if (!detalle)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Expediente no encontrado"),
        };
      return {
        status: 200 as const,
        body: {
          expedienteId: detalle.id,
          mensajes: detalle.mensajes,
          historial: detalle.historial,
        },
      };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
