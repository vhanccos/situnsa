import { type DbExecutor, expedientes, subetapas, sustentaciones, usuarios } from "@pis/db";
import type { TitulandoConsejo } from "@pis/domain";
import { and, asc, eq, exists } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export type AlcanceConsejo = "consejo" | "aprobacion";

/**
 * Titulandos para el Consejo de Facultad (HU-0046): expedientes en
 * EN_APROBACION; con alcance «consejo», solo los que tienen en curso la
 * subetapa E6_CONSEJO_FACULTAD (listos para la próxima sesión).
 */
export async function titulandosParaConsejo(
  db: DbExecutor,
  alcance: AlcanceConsejo,
): Promise<TitulandoConsejo[]> {
  const p1 = alias(usuarios, "p1");
  const p2 = alias(usuarios, "p2");
  const enAprobacion = eq(expedientes.estado, "EN_APROBACION");
  const enConsejo = exists(
    db
      .select({ id: subetapas.id })
      .from(subetapas)
      .where(
        and(
          eq(subetapas.expedienteId, expedientes.id),
          eq(subetapas.estado, "EN_CURSO"),
          eq(subetapas.clave, "E6_CONSEJO_FACULTAD"),
        ),
      ),
  );
  const filas = await db
    .select({
      codigo: expedientes.codigo,
      programa: expedientes.programa,
      modalidad: expedientes.modalidad,
      titulo: expedientes.titulo,
      fechaExpediente: expedientes.fechaSustentacion,
      fechaSustentacion: sustentaciones.fecha,
      p1Nombres: p1.nombres,
      p1Apellidos: p1.apellidos,
      p1Dni: p1.dni,
      p2Nombres: p2.nombres,
      p2Apellidos: p2.apellidos,
      p2Dni: p2.dni,
    })
    .from(expedientes)
    .leftJoin(p1, eq(p1.id, expedientes.participante1Id))
    .leftJoin(p2, eq(p2.id, expedientes.participante2Id))
    .leftJoin(sustentaciones, eq(sustentaciones.expedienteId, expedientes.id))
    .where(alcance === "consejo" ? and(enAprobacion, enConsejo) : enAprobacion)
    .orderBy(asc(expedientes.codigo));
  return filas.map((f) => ({
    codigo: f.codigo,
    programa: f.programa,
    modalidad: f.modalidad,
    titulo: f.titulo,
    fechaSustentacion: f.fechaSustentacion ?? f.fechaExpediente,
    participantes: [
      f.p1Dni ? { nombres: f.p1Nombres ?? "", apellidos: f.p1Apellidos ?? "", dni: f.p1Dni } : null,
      f.p2Dni ? { nombres: f.p2Nombres ?? "", apellidos: f.p2Apellidos ?? "", dni: f.p2Dni } : null,
    ].filter((p): p is { nombres: string; apellidos: string; dni: string } => p !== null),
  }));
}
