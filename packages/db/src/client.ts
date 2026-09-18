import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://pis:pis_dev@localhost:5432/pis_titulacion";

export const pool = new pg.Pool({ connectionString });
export const db = drizzle(pool, { schema });
export type Db = typeof db;
