import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerProgramasRoutes } from "./modules/catalogos/catalogos.routes.js";
import { registerDocumentosRoutes } from "./modules/documentos/documentos.routes.js";
import { registerExpedientesRoutes } from "./modules/expedientes/expedientes.routes.js";
import {
  registerAsesoresRoutes,
  registerTalleresRoutes,
} from "./modules/talleres/talleres.routes.js";

const PORT = Number(process.env.PORT ?? 3001);

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors);
  await app.register(helmet);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });

  app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
  app.get("/docs", async () => ({ contract: "pis @ts-rest", version: "0.1.0" }));

  registerAuthRoutes(app);
  registerProgramasRoutes(app);
  registerExpedientesRoutes(app);
  registerDocumentosRoutes(app);
  registerTalleresRoutes(app);
  registerAsesoresRoutes(app);

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
