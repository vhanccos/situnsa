import PgBoss from "pg-boss";

let boss: PgBoss | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (boss) return boss;
  boss = new PgBoss(
    process.env.DATABASE_URL ?? "postgres://pis:pis_dev@localhost:5432/pis_titulacion",
  );
  boss.on("error", (err: unknown) => console.error("[pg-boss]", err));
  await boss.start();
  return boss;
}

export async function enqueue(queue: string, payload: unknown): Promise<void> {
  const b = await getBoss();
  await b.send(queue, payload as Record<string, unknown>);
}
