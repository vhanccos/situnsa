import { db, subetapas } from "@pis/db";
import { and, eq, isNull, lt } from "drizzle-orm";
import { COLA_CORREOS, COLA_RECORDATORIOS, type CorreoPayload } from "./colas.js";
import { getBoss } from "./pg-boss.client.js";

let registrados = false;

/**
 * Workers pg-boss (Oleada B4): correos + recordatorios de plazos.
 * Transporte de correo = log estructurado (Mailpit listo vía SMTP_* para
 * el transporte real, P2). Idempotentes y best-effort: nunca tumban la API.
 */
export async function iniciarWorkers(): Promise<void> {
  if (registrados) return;
  let boss: Awaited<ReturnType<typeof getBoss>>;
  try {
    boss = await getBoss();
  } catch (err) {
    console.error("[workers] pg-boss no disponible; workers desactivados", err);
    return;
  }
  // Las colas deben existir antes de programar el cron (schedule en
  // cola inexistente = "Queue not found"). createQueue es idempotente.
  await boss.createQueue(COLA_CORREOS);
  await boss.createQueue(COLA_RECORDATORIOS);
  await boss.work<CorreoPayload>(COLA_CORREOS, async (jobs) => {
    const job = jobs[0];
    const p = job?.data;
    // Transporte log (P2: nodemailer → Mailpit SMTP_HOST/SMTP_PORT).
    console.log(
      JSON.stringify({
        canal: "correo",
        expedienteId: p?.expedienteId ?? null,
        codigo: p?.codigo ?? null,
        texto: p?.texto ?? null,
      }),
    );
  });
  await boss.work(COLA_RECORDATORIOS, async () => {
    await revisarPlazos();
  });
  // Revisión diaria de plazos estancados (pg-boss schedule, best-effort).
  try {
    await boss.schedule(COLA_RECORDATORIOS, "0 7 * * *");
  } catch (err) {
    console.error("[workers] no se pudo programar recordatorios", err);
  }
  registrados = true;
  console.log("[workers] correos + recordatorios activos");
}

/**
 * Subetapas EN_CURSO iniciadas hace más de 10 días corridos: se reportan
 * como estancadas (el plazo fino por subetapa vive en calendar-rules.md).
 * Exportada para invocación manual y specs.
 */
export async function revisarPlazos(ahora: Date = new Date()): Promise<number> {
  try {
    const corte = new Date(ahora.getTime() - 10 * 86_400_000);
    const rows = await db
      .select({ id: subetapas.id, etapa: subetapas.etapa, orden: subetapas.orden })
      .from(subetapas)
      .where(
        and(eq(subetapas.estado, "EN_CURSO"), isNull(subetapas.fin), lt(subetapas.inicio, corte)),
      );
    for (const r of rows) {
      console.log(
        JSON.stringify({ canal: "recordatorio", subetapa: `${r.etapa}.${r.orden}`, id: r.id }),
      );
    }
    return rows.length;
  } catch (err) {
    console.error("[workers] revisarPlazos falló", err);
    return 0;
  }
}
