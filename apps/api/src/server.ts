import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import Fastify from "fastify";
import { registerAuthRoutes } from "./modules/auth/auth.routes.js";
import { registerProgramasRoutes } from "./modules/catalogos/catalogos.routes.js";
import { registerDocumentosRoutes } from "./modules/documentos/documentos.routes.js";
import { registerExpedientesRoutes } from "./modules/expedientes/expedientes.routes.js";
import { registerSeguimientoRoutes } from "./modules/seguimiento/seguimiento.routes.js";
import { registerSeguridadRoutes } from "./modules/seguridad/seguridad.routes.js";
import {
  registerGruposRoutes,
  registerReportesRoutes,
} from "./modules/talleres/grupos-pagos.routes.js";
import {
  registerAsesoresRoutes,
  registerTalleresRoutes,
} from "./modules/talleres/talleres.routes.js";

const PORT = Number(process.env.PORT ?? 3001);

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors);
  await app.register(helmet);
  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } });
  // Límite global anti-abuso (S-FIPS Controles); login tiene tope propio + bloqueo 5×15min.
  await app.register(rateLimit, { global: true, max: 500, timeWindow: "1 minute" });

  app.get("/health", async () => ({ ok: true, version: "0.1.0" }));
  app.get("/docs", async () => ({ contract: "pis @ts-rest", version: "0.1.0" }));

  registerAuthRoutes(app);
  registerSeguridadRoutes(app);
  registerSeguimientoRoutes(app);
  registerProgramasRoutes(app);
  registerExpedientesRoutes(app);
  registerDocumentosRoutes(app);
  registerTalleresRoutes(app);
  registerAsesoresRoutes(app);
  registerGruposRoutes(app);
  registerReportesRoutes(app);

  return app;
}

const isMain = process.argv[1]?.match(/server\.[tj]s$/) !== null;
if (isMain) {
  buildServer()
    .then(async (app) => {
      // Workers pg-boss best-effort (nunca bloquean el arranque ni tumban la API).
      const { iniciarWorkers } = await import("./infra/jobs/workers.js");
      await iniciarWorkers();
      await app.listen({ port: PORT, host: "0.0.0.0" });
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
