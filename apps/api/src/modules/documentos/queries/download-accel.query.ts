import type { FastifyReply, FastifyRequest } from "fastify";
import { LocalStorageService } from "../../../infra/storage/local-storage.service.js";

/**
 * GET /api/documentos/:id/descargar → X-Accel-Redirect.
 * Fastify autentica/autoriza; Nginx transmite el archivo (0 MB en Node).
 */
export async function downloadAccelQuery(
  req: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const storage = new LocalStorageService();
  // Skeleton: expediente/file fijos; la query Drizzle real llega en RF-03.
  const accel = storage.accelPath("exp_demo", `${req.params.id}.pdf`);
  void req;
  reply.header("X-Accel-Redirect", accel);
  reply.header("Content-Type", "application/pdf");
  reply.status(200).send();
}
