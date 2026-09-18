import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const VistoBuenoSchema = z.object({
  aprobado: z.boolean(),
  comentario: z.string().max(2000).optional(),
});

export const VistoBuenoDTOSchema = z.object({
  id: z.string().uuid(),
  estado: z.string(),
  version: z.number(),
});

export const DocumentoMetadataSchema = z.object({
  id: z.string().uuid(),
  expedienteId: z.string().uuid(),
  tipo: z.string(),
  etapa: z.string(),
  version: z.number(),
  sha256: z.string().length(64),
  estado: z.enum(["PENDIENTE", "CARGADO", "OBSERVADO", "APROBADO", "RECHAZADO"]),
});

/** Respuesta del upload multipart (ruta nativa Fastify, ver documentos.routes). */
export const SubirDocumentoResponseSchema = z.object({
  id: z.string().uuid(),
  tipo: z.string(),
  version: z.number(),
  sha256: z.string(),
  estado: z.string(),
});

const c = initContract();

export const documentosContract = c.router({
  metadata: {
    method: "GET",
    path: "/api/documentos/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: DocumentoMetadataSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Metadatos de documento",
  },
  descargar: {
    method: "GET",
    path: "/api/documentos/:id/descargar",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      302: z.void(),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Descarga protegida vía X-Accel-Redirect (Nginx)",
  },
  vistoBueno: {
    method: "POST",
    path: "/api/documentos/:id/visto-bueno",
    pathParams: z.object({ id: z.string().uuid() }),
    body: VistoBuenoSchema,
    responses: {
      200: VistoBuenoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "V°B° académico del documento (RN-08: no cierra subetapa)",
  },
});
