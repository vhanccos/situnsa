import { type DbExecutor, type PropuestaSustentacion, propuestasSustentacion } from "@pis/db";
import { desc, eq } from "drizzle-orm";

/** Propuesta de fechas vigente (la más reciente) del expediente (HU-0038). */
export async function propuestaVigente(
  tx: DbExecutor,
  expedienteId: string,
): Promise<PropuestaSustentacion | null> {
  const rows = await tx
    .select()
    .from(propuestasSustentacion)
    .where(eq(propuestasSustentacion.expedienteId, expedienteId))
    .orderBy(desc(propuestasSustentacion.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
