import type { InscribirPlanInput } from "@pis/contracts";
import { type Db, db, expedientes, usuarios } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";

export interface ExpedienteRegistrado {
  id: string;
  codigo: string;
}

/**
 * §10 Registro de Nuevo Expediente (RF-01): upsert de participantes por DNI,
 * expediente en REGISTRADO, auditoría GENESIS. La validación (§12) lo pasa a EN_PLAN.
 */
export class InscribirPlanUseCase {
  async execute(input: InscribirPlanInput): Promise<Result<ExpedienteRegistrado, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const p1 = await upsertParticipante(tx, input.participante1, "TESISTA");
      let p2Id: string | null = null;
      if (input.participante2) {
        const p2 = await upsertParticipante(tx, input.participante2, "TESISTA");
        p2Id = p2.id;
      }
      let asesorId: string | null = null;
      if (input.asesorDni) {
        const rows = await tx
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(eq(usuarios.dni, input.asesorDni))
          .limit(1);
        asesorId = rows[0]?.id ?? null;
      }
      const codigos = await tx.select({ codigo: expedientes.codigo }).from(expedientes);
      const max = codigos.reduce((n, r) => {
        const m = /^SET(\d+)$/.exec(r.codigo);
        return m?.[1] ? Math.max(n, Number.parseInt(m[1], 10)) : n;
      }, 0);
      const codigo = `SET${String(max + 1).padStart(3, "0")}`;
      const inserted = await tx
        .insert(expedientes)
        .values({
          codigo,
          estado: "REGISTRADO",
          modalidad: input.modalidad,
          programa: input.programa,
          titulo: input.titulo,
          participante1Id: p1.id,
          participante2Id: p2Id,
          asesorId,
        })
        .returning({ id: expedientes.id });
      const row = inserted[0];
      if (!row)
        return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo crear el expediente"));
      await appendAuditoria(tx, {
        expedienteId: row.id,
        actorId: null,
        actorDni: "sistema",
        estadoAnterior: null,
        estadoNuevo: "REGISTRADO",
        detalle: `Registro de expediente ${codigo}`,
      });
      return ok({ id: row.id, codigo });
    });
  }
}

async function upsertParticipante(
  tx: Db,
  p: InscribirPlanInput["participante1"],
  rol: "TESISTA",
): Promise<{ id: string }> {
  const rows = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.dni, p.dni))
    .limit(1);
  const existing = rows[0];
  if (existing) {
    await tx
      .update(usuarios)
      .set({
        nombres: p.nombres,
        apellidos: p.apellidos,
        email: p.email,
        cui: p.cui ?? null,
        telefono: p.telefono ?? null,
      })
      .where(eq(usuarios.id, existing.id));
    return { id: existing.id };
  }
  const inserted = await tx
    .insert(usuarios)
    .values({
      dni: p.dni,
      cui: p.cui ?? null,
      email: p.email,
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono ?? null,
      rol,
    })
    .returning({ id: usuarios.id });
  const created = inserted[0];
  if (!created) throw new DomainError("VALIDACION_FALLIDA", "No se pudo crear el participante");
  return { id: created.id };
}
