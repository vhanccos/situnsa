import { db } from "./client.js";
import { seedBase } from "./seed/base.js";

/** Solo catálogos (seguro en prod). Uso: pnpm --filter @pis/db db:seed:base */
async function main(): Promise<void> {
  await seedBase(db);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
