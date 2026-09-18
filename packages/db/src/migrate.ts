import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

/**
 * Aplica las migraciones versionadas de ./drizzle (flujo reproducible).
 * `db:push` queda solo como atajo de prototipado: no es auditable ni
 * corre en CI/prod. Uso: pnpm --filter @pis/db db:migrate
 */
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "postgres://pis:pis_dev@localhost:5432/pis_titulacion";
  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    url.includes("sslmode=require") ||
    url.includes("render.com");

  const pool = new pg.Pool({
    connectionString: url,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas OK");
  await pool.end();
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
