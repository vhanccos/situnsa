import { basename } from "node:path";
import { VistoBuenoSchema } from "@pis/contracts";
import { db, documentos } from "@pis/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { LocalStorageService } from "../../infra/storage/local-storage.service.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { SubirDocumentoUseCase } from "./use-cases/subir-documento/subir-documento.use-case.js";
import { VistoBuenoDocumentoUseCase } from "./use-cases/visto-bueno/visto-bueno.use-case.js";

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
    reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Documento no encontrado"));
    return;
  }
  const a = await autorizar(req.actor, {
    permiso: ["documentos", "ver"],
    expedienteId: doc.expedienteId,
  });
  if (!a.ok) {
    reply.status(a.status).send(a.body);
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
    { preHandler: requireAuth },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const data = await req.file();
      const fields = data?.fields as unknown as
        | { expedienteId?: { value: string }; tipo?: { value: string } }
        | undefined;
      const expedienteId = fields?.expedienteId?.value;
      const tipo = fields?.tipo?.value;
      if (!data || !expedienteId || !tipo) {
        reply
          .status(400)
          .send(errorEnvelope("VALIDACION_FALLIDA", "Se requiere expedienteId, tipo y file (PDF)"));
        return;
      }
      const a = await autorizar(req.actor, {
        permiso: ["documentos", "crear"],
        expedienteId,
      });
      if (!a.ok) {
        reply.status(a.status).send(a.body);
        return;
      }
      const bytes = new Uint8Array(await data.toBuffer());
      const uc = new SubirDocumentoUseCase(new LocalStorageService());
      const actor = req.actor ?? { id: "", dni: "desconocido" }; // requireAuth+autorizar garantizan actor
      const r = await uc.execute({ expedienteId, tipo, filename: data.filename, bytes, actor });
      if (!r.ok) {
        reply.status(400).send(errorEnvelope(r.error.code, r.error.message));
        return;
      }
      reply.status(201).send(r.value);
    },
  );

  app.get(
    "/api/documentos/:id",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const rows = await db
        .select()
        .from(documentos)
        .where(eq(documentos.id, req.params.id))
        .limit(1);
      const doc = rows[0];
      if (!doc) {
        reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Documento no encontrado"));
        return;
      }
      const a = await autorizar(req.actor, {
        permiso: ["documentos", "ver"],
        expedienteId: doc.expedienteId,
      });
      if (!a.ok) {
        reply.status(a.status).send(a.body);
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

  app.get(
    "/api/documentos/:id/descargar",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    downloadAccelQuery,
  );

  // V°B° académico (ruta nativa JSON validada contra el contrato;
  // ts-rest no registra este módulo — igual que el upload multipart).
  app.post(
    "/api/documentos/:id/visto-bueno",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const parsed = VistoBuenoSchema.safeParse(req.body);
      if (!parsed.success) {
        reply
          .status(400)
          .send(errorEnvelope("VALIDACION_FALLIDA", "Cuerpo inválido para el visto bueno"));
        return;
      }
      const rows = await db
        .select({ expedienteId: documentos.expedienteId })
        .from(documentos)
        .where(eq(documentos.id, req.params.id))
        .limit(1);
      const expedienteId = rows[0]?.expedienteId ?? null;
      const a = await autorizar(
        req.actor,
        expedienteId
          ? { permiso: ["documentos", "aprobar"], expedienteId }
          : { permiso: ["documentos", "aprobar"] },
      );
      if (!a.ok) {
        reply.status(a.status).send(a.body);
        return;
      }
      const actor = req.actor ?? { id: "", dni: "desconocido" };
      const uc = new VistoBuenoDocumentoUseCase();
      const r = await uc.execute(
        req.params.id,
        {
          aprobado: parsed.data.aprobado,
          ...(parsed.data.comentario !== undefined ? { comentario: parsed.data.comentario } : {}),
        },
        actor,
      );
      if (!r.ok) {
        const status = r.error.code === "NO_ENCONTRADO" ? 404 : 400;
        reply.status(status).send(errorEnvelope(r.error.code, r.error.message));
        return;
      }
      reply.status(200).send(r.value);
    },
  );
}
