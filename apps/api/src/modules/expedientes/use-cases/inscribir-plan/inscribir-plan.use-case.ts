import type { InscribirPlanInput } from "@pis/contracts";
import { type DbExecutor, db, expedientes, usuarios } from "@pis/db";
import { compararNombre, DomainError, esProgramaOficial, fail, ok, type Result } from "@pis/domain";
import { eq, sql } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../../infra/jobs/colas.js";
import { asignarRol } from "../../../seguridad/roles.repository.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";

export interface ExpedienteRegistrado {
  id: string;
  codigo: string;
}

export interface Actor {
  id: string;
  dni: string;
}

type Participante = InscribirPlanInput["participante1"];

/**
 * §10 Registro de Nuevo Expediente (RF-01):
 * - RN-L04/L14: programa de los 13 oficiales (INC-01: «Seleccione» no pasa).
 * - HU-0019: si el DNI ya existe, el nombre debe coincidir con el registrado
 *   (incluidas tildes); nunca se sobrescribe la identidad de otra persona.
 * - INC-02: correo de otra persona → DATOS_DUPLICADOS (409) con mensaje claro.
 * - Correlativo SET bajo candado transaccional (sin carreras).
 * La validación (§12) lo pasa a EN_PLAN y envía el acceso al portal.
 */
export class InscribirPlanUseCase {
  async execute(
    input: InscribirPlanInput,
    actor?: Actor,
  ): Promise<Result<ExpedienteRegistrado, DomainError>> {
    if (!esProgramaOficial(input.programa)) {
      return fail(
        new DomainError(
          "VALIDACION_FALLIDA",
          "Programa inválido: selecciona uno de los 13 programas oficiales",
        ),
      );
    }
    if (input.participante2) {
      if (input.participante2.dni === input.participante1.dni) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Los participantes tienen el mismo DNI"));
      }
      if (
        input.participante2.email.trim().toLowerCase() ===
        input.participante1.email.trim().toLowerCase()
      ) {
        return fail(
          new DomainError("VALIDACION_FALLIDA", "Cada participante debe tener su propio correo"),
        );
      }
    }
    const titulo = input.titulo.trim();
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const p1 = await resolverParticipante(tx, input.participante1, "Participante 01");
      if (!p1.ok) return p1;
      let p2Id: string | null = null;
      if (input.participante2) {
        const p2 = await resolverParticipante(tx, input.participante2, "Participante 02");
        if (!p2.ok) return p2;
        p2Id = p2.value;
      }
      let asesorId: string | null = null;
      if (input.asesorDni) {
        const rows = await tx
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(eq(usuarios.dni, input.asesorDni))
          .limit(1);
        asesorId = rows[0]?.id ?? null;
        if (!asesorId) {
          return fail(
            new DomainError("VALIDACION_FALLIDA", `No existe un asesor con DNI ${input.asesorDni}`),
          );
        }
      }
      // Correlativo SET: candado transaccional → dos registros simultáneos
      // nunca obtienen el mismo código.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('expedientes:codigo'))`);
      const maximo = await tx.execute<{ max: number | null }>(
        sql`select max(cast(substring(${expedientes.codigo} from 4) as integer)) as max from ${expedientes} where ${expedientes.codigo} ~ '^SET[0-9]+$'`,
      );
      const siguiente = Number(maximo.rows[0]?.max ?? 0) + 1;
      const codigo = `SET${String(siguiente).padStart(3, "0")}`;
      const inserted = await tx
        .insert(expedientes)
        .values({
          codigo,
          estado: "REGISTRADO",
          modalidad: input.modalidad,
          programa: input.programa,
          titulo,
          participante1Id: p1.value,
          participante2Id: p2Id,
          asesorId,
        })
        .returning({ id: expedientes.id });
      const row = inserted[0];
      if (!row) {
        return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo crear el expediente"));
      }
      await appendAuditoria(tx, {
        expedienteId: row.id,
        actorId: actor?.id ?? null,
        actorDni: actor?.dni ?? "sistema",
        estadoAnterior: null,
        estadoNuevo: "REGISTRADO",
        detalle: `Registro de expediente ${codigo}`,
      });
      return ok({ id: row.id, codigo });
    });
    if (r.ok) {
      await enqueueCorreo({
        expedienteId: r.value.id,
        asunto: `Expediente ${r.value.codigo} registrado`,
        titulo: "Registramos tu expediente de titulación",
        texto:
          "El área de titulación registró tu expediente. Te avisaremos por este medio cuando sea validado; en ese momento recibirás el enlace para crear tu clave de acceso al portal.",
      });
    }
    return r;
  }
}

async function resolverParticipante(
  tx: DbExecutor,
  p: Participante,
  etiqueta: string,
): Promise<Result<string, DomainError>> {
  const email = p.email.trim().toLowerCase();
  const nombres = p.nombres.trim().replace(/\s+/g, " ");
  const apellidos = p.apellidos.trim().replace(/\s+/g, " ");
  const porDni = await tx.select().from(usuarios).where(eq(usuarios.dni, p.dni)).limit(1);
  const existente = porDni[0];

  const correoDeOtro = await tx
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(sql`lower(${usuarios.email}) = ${email}`)
    .limit(1);
  const duenoCorreo = correoDeOtro[0]?.id ?? null;

  if (existente) {
    const comparacion = compararNombre(existente, { nombres, apellidos });
    const registrado = `${existente.nombres} ${existente.apellidos}`;
    if (comparacion === "DIFIERE_EN_TILDES") {
      return fail(
        new DomainError(
          "VALIDACION_FALLIDA",
          `${etiqueta}: el nombre difiere en tildes del registrado para el DNI ${p.dni} («${registrado}»). Debe coincidir exactamente con el DNI.`,
        ),
      );
    }
    if (comparacion === "DISTINTO") {
      return fail(
        new DomainError(
          "DATOS_DUPLICADOS",
          `${etiqueta}: el DNI ${p.dni} ya está registrado a nombre de otra persona («${registrado}»).`,
        ),
      );
    }
    if (duenoCorreo && duenoCorreo !== existente.id) {
      return fail(
        new DomainError(
          "DATOS_DUPLICADOS",
          `${etiqueta}: el correo ${email} ya está registrado para otra persona.`,
        ),
      );
    }
    // Solo se completa el contacto de quien aún no tiene cuenta activa:
    // nunca se cambia la identidad ni el correo de una cuenta en uso.
    if (existente.passwordHash === null) {
      await tx
        .update(usuarios)
        .set({
          email,
          cui: p.cui?.trim() || existente.cui,
          telefono: p.telefono?.trim() || existente.telefono,
        })
        .where(eq(usuarios.id, existente.id));
    }
    await asignarRol(tx, existente.id, "TESISTA");
    return ok(existente.id);
  }

  if (duenoCorreo) {
    return fail(
      new DomainError(
        "DATOS_DUPLICADOS",
        `${etiqueta}: el correo ${email} ya está registrado para otra persona.`,
      ),
    );
  }
  const inserted = await tx
    .insert(usuarios)
    .values({
      dni: p.dni,
      cui: p.cui?.trim() || null,
      email,
      nombres,
      apellidos,
      telefono: p.telefono?.trim() || null,
      rol: "TESISTA",
    })
    .returning({ id: usuarios.id });
  const creado = inserted[0];
  if (!creado) {
    return fail(new DomainError("VALIDACION_FALLIDA", `${etiqueta}: no se pudo registrar`));
  }
  await asignarRol(tx, creado.id, "TESISTA");
  return ok(creado.id);
}
