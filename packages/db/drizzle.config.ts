import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit carga el schema con require() plano: no resuelve los
 * sufijos `.js` → `.ts` del código fuente (NodeNext). Por eso los comandos
 * db:push / db:generate compilan primero (tsc → dist/) y apuntan al
 * schema compilado vía DRIZZLE_SCHEMA. Determinista y reproducible.
 */
export default defineConfig({
  schema: process.env.DRIZZLE_SCHEMA ?? "./dist/schema/index.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://pis:pis_dev@localhost:5432/pis_titulacion",
  },
});
