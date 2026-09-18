import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import { downloadAccelQuery } from "./modules/documentos/queries/download-accel.query.js";
import { registerExpedientesRoutes } from "./modules/expedientes/expedientes.routes.js";

const PORT = Number(process.env.PORT ?? 3001);

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors);
  await app.register(helmet);

  app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
  app.get("/docs", async () => ({ contract: "pis @ts-rest", version: "0.1.0" }));

  registerExpedientesRoutes(app);
  app.get("/api/documentos/:id/descargar", downloadAccelQuery);

  return app;
}

const isMain = process.argv[1]?.endsWith("server.ts") ?? false;
if (isMain) {
  buildServer()
    .then((app) => app.listen({ port: PORT, host: "0.0.0.0" }))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
