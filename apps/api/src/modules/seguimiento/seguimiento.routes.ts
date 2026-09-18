import { seguimientoContract } from "@pis/contracts";
import { db } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { getDetalleById } from "../expedientes/expedientes.repository.js";
import { ObservarInscripcionUseCase } from "../expedientes/use-cases/observar-inscripcion/observar-inscripcion.use-case.js";
import { FinalizarSubetapaUseCase } from "./use-cases/finalizar-subetapa.use-case.js";

const s = initServer();

/** Operación del proceso (B1+B2): observar, finalizar, seguimiento, historial. */
export function registerSeguimientoRoutes(app: FastifyInstance): void {
  const router = s.router(seguimientoContract, {
    observar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["inscripciones", "aprobar"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ObservarInscripcionUseCase();
      const r = await uc.execute(params.id, body.motivo, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value };
    },
    finalizarSubetapa: async ({ params, request }) => {
      // El alcance se deriva de la subetapa → expediente dentro del use-case;
      // aquí se exige el permiso de cierre (RN-08: solo responsable/staff).
      const { subetapas } = await import("@pis/db");
      const rows = await db
        .select({ expedienteId: subetapas.expedienteId })
        .from(subetapas)
        .where(eq(subetapas.id, params.id))
        .limit(1);
      const expedienteId = rows[0]?.expedienteId ?? null;
      const a = await autorizar(
        request.actor,
        expedienteId
          ? { permiso: ["seguimiento", "aprobar"], expedienteId }
          : { permiso: ["seguimiento", "aprobar"] },
      );
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new FinalizarSubetapaUseCase();
      const r = await uc.execute(params.id, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 200 as const, body: r.value };
    },
    seguimiento: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["seguimiento", "ver"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
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
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
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
    scoped.register(s.plugin(router));
  });
}
