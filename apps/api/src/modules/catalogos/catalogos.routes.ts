import { programasContract } from "@pis/contracts";
import { db, programas } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { asc } from "drizzle-orm";
import type { FastifyInstance } from "fastify";

const s = initServer();

/** Catálogos (§18). Sin auth: lectura pública de catálogos oficiales. */
export function registerProgramasRoutes(app: FastifyInstance): void {
  const router = s.router(programasContract, {
    listar: async () => {
      const rows = await db.select().from(programas).orderBy(asc(programas.nombre));
      return { status: 200 as const, body: { items: rows } };
    },
  });
  app.register(s.plugin(router));
}
