import type { Db } from "@pis/db";
import {
  db,
  expedientes,
  jurados,
  juradosExpediente,
  sustentaciones,
  validacionesInstitucionales,
} from "@pis/db";
import { assertTransition, DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { appendAuditoria } from "../../expedientes/expedientes.auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

async function estadoDe(tx: Db, id: string) {
  const rows = await tx
    .select({ estado: expedientes.estado })
    .from(expedientes)
    .where(eq(expedientes.id, id))
    .limit(1);
  return rows[0]?.estado ?? null;
}

/** Designar jurado (sorteo E3 / terna E1): crea el jurado si no existe y lo vincula. */
export class DesignarJuradoUseCase {
  async execute(
    expedienteId: string,
    input: { dni: string; nombres: string; apellidos: string; grado?: string; rol: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const macro = await estadoDe(tx, expedienteId);
      if (!macro) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      let juradoId: string;
      const ex = await tx.select().from(jurados).where(eq(jurados.dni, input.dni)).limit(1);
      if (ex[0]) {
        juradoId = ex[0].id;
      } else {
        const ins = await tx
          .insert(jurados)
          .values({
            dni: input.dni,
            nombres: input.nombres.trim(),
            apellidos: input.apellidos.trim(),
            grado: input.grado ?? null,
          })
          .returning({ id: jurados.id });
        if (!ins[0])
          return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar el jurado"));
        juradoId = ins[0].id;
      }
      const dup = await tx
        .select()
        .from(juradosExpediente)
        .where(
          and(
            eq(juradosExpediente.juradoId, juradoId),
            eq(juradosExpediente.expedienteId, expedienteId),
          ),
        )
        .limit(1);
      if (dup.length > 0)
        return fail(new DomainError("VALIDACION_FALLIDA", "El jurado ya está designado"));
      const vin = await tx
        .insert(juradosExpediente)
        .values({ juradoId, expedienteId, rol: input.rol })
        .returning({ id: juradosExpediente.id });
      if (!vin[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo designar"));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro,
        detalle: `Jurado designado: ${input.nombres.trim()} (${input.rol})`,
      });
      return ok({ id: vin[0].id });
    });
  }
}

/**
 * Dictamen (registro delegado RN-08): lo asienta el responsable con el
 * pronunciamiento del jurado como evidencia. OBSERVADO exige comentario.
 */
export class DictaminarUseCase {
  async execute(
    expedienteId: string,
    vinculoId: string,
    input: { dictamen: "FAVORABLE" | "OBSERVADO"; comentario?: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    if (input.dictamen === "OBSERVADO" && !(input.comentario ?? "").trim()) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "Observar exige un comentario para el tesista"),
      );
    }
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const macro = await estadoDe(tx, expedienteId);
      if (!macro) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const rows = await tx
        .select()
        .from(juradosExpediente)
        .where(
          and(
            eq(juradosExpediente.id, vinculoId),
            eq(juradosExpediente.expedienteId, expedienteId),
          ),
        )
        .limit(1);
      const vinc = rows[0];
      if (!vinc) return fail(new DomainError("NO_ENCONTRADO", "Designación no encontrada"));
      await tx
        .update(juradosExpediente)
        .set({ dictamen: input.dictamen, comentario: input.comentario?.trim() ?? null })
        .where(eq(juradosExpediente.id, vinculoId));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro,
        detalle: `Dictamen ${input.dictamen} (registro delegado)`,
      });
      return ok({ id: vinculoId });
    });
  }
}

/** Programar sustentación (crea o reprograma mientras no tenga acta). */
export class ProgramarSustentacionUseCase {
  async execute(
    expedienteId: string,
    input: { fecha: string; hora: string; lugar: string; modalidad: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    if (!input.fecha.trim() || !input.hora.trim() || input.lugar.trim().length < 3) {
      return fail(new DomainError("VALIDACION_FALLIDA", "Fecha, hora y lugar son obligatorios"));
    }
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const macro = await estadoDe(tx, expedienteId);
      if (!macro) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const prev = await tx
        .select()
        .from(sustentaciones)
        .where(eq(sustentaciones.expedienteId, expedienteId))
        .limit(1);
      if (prev[0]?.actaVeredicto) {
        return fail(
          new DomainError("TRANSICION_INVALIDA", "La sustentación ya tiene acta registrada"),
        );
      }
      if (prev[0]) {
        await tx
          .update(sustentaciones)
          .set({
            fecha: input.fecha,
            hora: input.hora,
            lugar: input.lugar.trim(),
            modalidad: input.modalidad,
          })
          .where(eq(sustentaciones.id, prev[0].id));
        await appendAuditoria(tx, {
          expedienteId,
          actorId: actor.id,
          actorDni: actor.dni,
          estadoAnterior: macro,
          estadoNuevo: macro,
          detalle: `Sustentación reprogramada: ${input.fecha} ${input.hora}`,
        });
        return ok({ id: prev[0].id });
      }
      const ins = await tx
        .insert(sustentaciones)
        .values({
          expedienteId,
          fecha: input.fecha,
          hora: input.hora,
          lugar: input.lugar.trim(),
          modalidad: input.modalidad,
        })
        .returning({ id: sustentaciones.id });
      if (!ins[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo programar"));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro,
        detalle: `Sustentación programada: ${input.fecha} ${input.hora}`,
      });
      return ok({ id: ins[0].id });
    });
  }
}

/**
 * Acta de sustentación (RF-05 E4.5): veredicto aprobatorio
 * APTO_SUSTENTACION → SUSTENTADO; desaprobación → DESAPROBADO_TRUNCO (FSM).
 */
export class RegistrarActaUseCase {
  async execute(
    expedienteId: string,
    veredicto: "FELICITACION" | "UNANIMIDAD" | "MAYORIA" | "DESAPROBACION",
    actor: Actor,
  ): Promise<Result<{ id: string; estado: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const macro = await estadoDe(tx, expedienteId);
      if (!macro) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const prev = await tx
        .select()
        .from(sustentaciones)
        .where(eq(sustentaciones.expedienteId, expedienteId))
        .limit(1);
      const sust = prev[0];
      if (!sust)
        return fail(new DomainError("VALIDACION_FALLIDA", "Primero programa la sustentación"));
      if (sust.actaVeredicto) {
        return fail(new DomainError("TRANSICION_INVALIDA", "El acta ya fue registrada"));
      }
      const destino = veredicto === "DESAPROBACION" ? "DESAPROBADO_TRUNCO" : "SUSTENTADO";
      const gate = assertTransition(macro as "APTO_SUSTENTACION", destino as "SUSTENTADO");
      if (!gate.ok) return fail(gate.error);
      await tx
        .update(sustentaciones)
        .set({ actaVeredicto: veredicto, actaFecha: new Date() })
        .where(eq(sustentaciones.id, sust.id));
      await tx
        .update(expedientes)
        .set({ estado: destino, updatedAt: new Date() })
        .where(eq(expedientes.id, expedienteId));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: destino,
        detalle: `Acta de sustentación: ${veredicto}`,
      });
      return ok({ id: sust.id, estado: destino });
    });
  }
}

/** Validación institucional por instancia (upsert, RF-06/07). */
export class RegistrarValidacionUseCase {
  async execute(
    expedienteId: string,
    input: { instancia: string; estado: string; detalle?: string },
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const macro = await estadoDe(tx, expedienteId);
      if (!macro) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const prev = await tx
        .select()
        .from(validacionesInstitucionales)
        .where(
          and(
            eq(validacionesInstitucionales.expedienteId, expedienteId),
            eq(validacionesInstitucionales.instancia, input.instancia),
          ),
        )
        .limit(1);
      if (prev[0]) {
        await tx
          .update(validacionesInstitucionales)
          .set({ estado: input.estado, detalle: input.detalle?.trim() ?? null })
          .where(eq(validacionesInstitucionales.id, prev[0].id));
        await appendAuditoria(tx, {
          expedienteId,
          actorId: actor.id,
          actorDni: actor.dni,
          estadoAnterior: macro,
          estadoNuevo: macro,
          detalle: `${input.instancia}: ${input.estado}`,
        });
        return ok({ id: prev[0].id });
      }
      const ins = await tx
        .insert(validacionesInstitucionales)
        .values({
          expedienteId,
          instancia: input.instancia,
          estado: input.estado,
          detalle: input.detalle?.trim() ?? null,
        })
        .returning({ id: validacionesInstitucionales.id });
      if (!ins[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar"));
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: macro,
        estadoNuevo: macro,
        detalle: `${input.instancia}: ${input.estado}`,
      });
      return ok({ id: ins[0].id });
    });
  }
}
