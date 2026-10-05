import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

/**
 * consejo = expedientes con la subetapa «Consejo de Facultad» en curso
 * (listos para la próxima sesión); aprobacion = toda la Etapa 6.
 */
export const ExportarConsejoQuerySchema = z.object({
  alcance: z.enum(["consejo", "aprobacion"]).default("consejo"),
});

const c = initContract();

/** Reportes institucionales del trámite (RF-07). Respuesta binaria: ruta nativa Fastify. */
export const reportesTitulacionContract = c.router({
  consejoFacultad: {
    method: "GET",
    path: "/api/reportes/consejo-facultad",
    query: ExportarConsejoQuerySchema,
    responses: {
      200: z.unknown(),
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Listado consolidado (XLSX) para la sesión del Consejo de Facultad (HU-0046)",
  },
});
