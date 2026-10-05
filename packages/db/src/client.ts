import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import pg from "pg";
import * as schema from "./schema/index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://pis:pis_dev@localhost:5432/pis_titulacion";

const useSsl =
  process.env.DATABASE_SSL === "true" ||
  connectionString.includes("sslmode=require") ||
  connectionString.includes("render.com");

export const pool = new pg.Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
});
export const db = drizzle(pool, { schema });
export type Db = typeof db;

/**
 * Conexión **o** transacción: los repositorios y la auditoría reciben este
 * tipo para poder ejecutarse dentro del Unit of Work (un único COMMIT).
 */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT, typeof schema>;
