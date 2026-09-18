import { initContract } from "@ts-rest/core";
import { z } from "zod";

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
    path: "/documentos/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: { 200: DocumentoMetadataSchema, 404: z.object({ message: z.string() }) },
    summary: "Metadatos de documento",
  },
  descargar: {
    method: "GET",
    path: "/documentos/:id/descargar",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: { 302: z.void(), 404: z.object({ message: z.string() }) },
    summary: "Descarga protegida vía X-Accel-Redirect (Nginx)",
  },
});
