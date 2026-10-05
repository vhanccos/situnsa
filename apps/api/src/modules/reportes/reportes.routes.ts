import { ExportarConsejoQuerySchema } from "@pis/contracts";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { ExportarListadoConsejoUseCase } from "./use-cases/exportar-listado-consejo/exportar-listado-consejo.use-case.js";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Reportes institucionales del trámite (RF-07). Rutas nativas: la respuesta
 * es un archivo (contrato documental en `reportes.contract.ts`).
 */
export function registerReportesTitulacionRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: Record<string, string | undefined> }>(
    "/api/reportes/consejo-facultad",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    async (req, reply) => {
      const a = await autorizar(req.actor, { permiso: ["reportes", "exportar"] });
      if (!a.ok) {
        await reply.status(a.status).send(a.body);
        return;
      }
      const q = ExportarConsejoQuerySchema.safeParse(req.query);
      if (!q.success) {
        await reply
          .status(400)
          .send(errorEnvelope("VALIDACION_FALLIDA", "Alcance inválido (consejo o aprobacion)"));
        return;
      }
      const r = await new ExportarListadoConsejoUseCase().execute(q.data.alcance);
      req.log.info(
        {
          reporte: "consejo-facultad",
          alcance: q.data.alcance,
          filas: r.total,
          actor: req.actor?.dni,
        },
        "exportación de reporte",
      );
      await reply
        .header("Content-Type", XLSX)
        .header("Content-Disposition", `attachment; filename="${r.nombreArchivo}"`)
        .header("Cache-Control", "no-store")
        .send(Buffer.from(r.bytes));
    },
  );
}
