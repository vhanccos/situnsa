import { basename } from "node:path";
import { db, documentos } from "@pis/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { LocalStorageService } from "../../infra/storage/local-storage.service.js";
import { stubAuth } from "../../middleware/stub-auth.js";
import { SubirDocumentoUseCase } from "./use-cases/subir-documento/subir-documento.use-case.js";

/**
 * GET /api/documentos/:id/descargar → X-Accel-Redirect.
 * Fastify autentica/autoriza; Nginx transmite el archivo (0 MB en Node).
 */
export async function downloadAccelQuery(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const rows = await db.select().from(documentos).where(eq(documentos.id, req.params.id)).limit(1);
  const doc = rows[0];
  if (!doc) {
    reply.status(404).send({ message: "Documento no encontrado" });
    return;
  }
  reply.header("X-Accel-Redirect", `/protected-files/${doc.expedienteId}/${basename(doc.ruta)}`);
  reply.header("Content-Type", "application/pdf");
  reply.header("Content-Disposition", `attachment; filename="${basename(doc.ruta)}"`);
  reply.status(200).send();
}

/**
 * POST /api/documentos/upload (multipart: expedienteId, tipo, file).
 * Excepción al patrón ts-rest: @ts-rest/fastify no maneja multipart de forma
 * fiable; ruta nativa delgada que delega al use-case (Result pattern intacto).
 */
export function registerDocumentosRoutes(app: FastifyInstance): void {
  app.post(
    "/api/documentos/upload",
    { preHandler: stubAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const data = await req.file();
      const fields = data?.fields as unknown as
        | { expedienteId?: { value: string }; tipo?: { value: string } }
        | undefined;
      const expedienteId = fields?.expedienteId?.value;
      const tipo = fields?.tipo?.value;
      if (!data || !expedienteId || !tipo) {
        reply.status(400).send({ message: "Se requiere expedienteId, tipo y file (PDF)" });
        return;
      }
      const bytes = new Uint8Array(await data.toBuffer());
      const uc = new SubirDocumentoUseCase(new LocalStorageService());
      const actor = req.actor ?? { id: "", dni: "desconocido" };
      const r = await uc.execute({ expedienteId, tipo, filename: data.filename, bytes, actor });
      if (!r.ok) {
        reply.status(400).send({ message: r.error.message, code: r.error.code });
        return;
      }
      reply.status(201).send(r.value);
    },
  );

  app.get(
    "/api/documentos/:id",
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const rows = await db
        .select()
        .from(documentos)
        .where(eq(documentos.id, req.params.id))
        .limit(1);
      const doc = rows[0];
      if (!doc) {
        reply.status(404).send({ message: "Documento no encontrado" });
        return;
      }
      reply.send({
        id: doc.id,
        expedienteId: doc.expedienteId,
        tipo: doc.tipo,
        etapa: doc.etapa,
        version: doc.version,
        sha256: doc.sha256,
        estado: doc.estado,
      });
    },
  );

  app.get("/api/documentos/:id/descargar", downloadAccelQuery);
}
