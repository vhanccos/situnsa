import { type DbExecutor, db, talleres, tallerSesiones, usuarios } from "@pis/db";
import {
  DomainError,
  fail,
  generarSesiones,
  ok,
  type Result,
  validarProgramacion,
} from "@pis/domain";
import { and, eq, inArray, ne } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import { appendAuditoriaTaller } from "../taller-auditoria.js";
import { detalleTaller, diasADiasCsv, type TallerDetalle } from "../talleres.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

export interface CrearTallerInput {
  nombre: string;
  periodo?: string;
  asesorDni?: string;
  fechaInicio: string;
  diasSesion: number[];
  horaInicio: string;
  horaFin: string;
  totalSesiones: number;
  cupoMax: number;
  enlace?: string;
}

async function asesorPorDni(tx: DbExecutor, dni: string) {
  const rows = await tx
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios)
    .where(eq(usuarios.dni, dni))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * P2 Nuevo taller: nombre único + programación válida → taller ACTIVO con
 * sesiones generadas. Spec: con alumnos o realizadas no se elimina, se cancela.
 */
export class CrearTallerUseCase {
  async execute(
    input: CrearTallerInput,
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const nombre = input.nombre.trim();
    if (nombre.length < 3)
      return fail(new DomainError("VALIDACION_FALLIDA", "El nombre debe tener al menos 3 letras"));
    const gate = validarProgramacion({
      dias: input.diasSesion,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      total: input.totalSesiones,
      cupoMax: input.cupoMax,
      enlace: input.enlace ?? null,
    });
    if (!gate.ok) return gate as Result<{ id: string }, DomainError>;
    const sesiones = generarSesiones({
      fechaInicio: input.fechaInicio,
      dias: input.diasSesion,
      horaInicio: input.horaInicio,
      horaFin: input.horaFin,
      total: input.totalSesiones,
    });
    if (!sesiones.ok) return sesiones as Result<{ id: string }, DomainError>;
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const dup = await tx
        .select({ id: talleres.id })
        .from(talleres)
        .where(eq(talleres.nombre, nombre))
        .limit(1);
      if (dup.length > 0)
        return fail(new DomainError("DATOS_DUPLICADOS", `Ya existe un taller llamado «${nombre}»`));
      let asesorId: string | null = null;
      if (input.asesorDni) {
        const a = await asesorPorDni(tx, input.asesorDni);
        if (!a)
          return fail(
            new DomainError("VALIDACION_FALLIDA", `Asesor DNI ${input.asesorDni} no existe`),
          );
        asesorId = a.id;
      }
      const inserted = await tx
        .insert(talleres)
        .values({
          nombre,
          periodo: input.periodo?.trim() || null,
          asesorId,
          fechaInicio: input.fechaInicio,
          diasSesion: diasADiasCsv(input.diasSesion),
          horaInicio: input.horaInicio,
          horaFin: input.horaFin,
          cupoMax: input.cupoMax,
          enlace: input.enlace?.trim() || null,
        })
        .returning({ id: talleres.id });
      const t = inserted[0];
      if (!t) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo crear el taller"));
      if (sesiones.value.length > 0) {
        await tx.insert(tallerSesiones).values(
          sesiones.value.map((s) => ({
            tallerId: t.id,
            nro: s.nro,
            fecha: s.fecha,
            horaInicio: s.horaInicio,
            horaFin: s.horaFin,
          })),
        );
      }
      await appendAuditoriaTaller(tx, {
        tallerId: t.id,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CREAR_TALLER",
        detalle: `Taller «${nombre}» con ${sesiones.value.length} sesiones`,
      });
      return ok({ id: t.id });
    });
  }
}

export interface EditarTallerInput {
  nombre?: string;
  periodo?: string | null;
  cupoMax?: number;
  enlace?: string | null;
}

/** P3 Editar: nombre, cupo y enlace (fecha/días/hora van por sesión). */
export class EditarTallerUseCase {
  async execute(
    id: string,
    patch: EditarTallerInput,
    actor: Actor,
  ): Promise<Result<TallerDetalle, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const detalle = await detalleTaller(tx, id);
      if (!detalle) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (detalle.estado !== "ACTIVO")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo un taller activo se puede editar"),
        );
      const cambios: Record<string, unknown> = {};
      if (patch.nombre !== undefined) {
        const nombre = patch.nombre.trim();
        if (nombre.length < 3)
          return fail(
            new DomainError("VALIDACION_FALLIDA", "El nombre debe tener al menos 3 letras"),
          );
        const dup = await tx
          .select({ id: talleres.id })
          .from(talleres)
          .where(and(eq(talleres.nombre, nombre), ne(talleres.id, id)))
          .limit(1);
        if (dup.length > 0)
          return fail(
            new DomainError("DATOS_DUPLICADOS", `Ya existe un taller llamado «${nombre}»`),
          );
        cambios.nombre = nombre;
      }
      if (patch.periodo !== undefined) cambios.periodo = patch.periodo?.trim() || null;
      if (patch.cupoMax !== undefined) {
        if (patch.cupoMax < detalle.inscritos)
          return fail(
            new DomainError(
              "VALIDACION_FALLIDA",
              `El cupo no puede quedar por debajo de los ${detalle.inscritos} alumnos asignados`,
            ),
          );
        cambios.cupoMax = patch.cupoMax;
      }
      if (patch.enlace !== undefined) {
        if (patch.enlace !== null && patch.enlace !== "" && !patch.enlace.startsWith("https://"))
          return fail(
            new DomainError("VALIDACION_FALLIDA", "El enlace de reunión debe empezar con https://"),
          );
        cambios.enlace = patch.enlace?.trim() || null;
      }
      if (Object.keys(cambios).length > 0) {
        await tx.update(talleres).set(cambios).where(eq(talleres.id, id));
        await appendAuditoriaTaller(tx, {
          tallerId: id,
          actorId: actor.id,
          actorDni: actor.dni,
          accion: "EDITAR_TALLER",
          detalle: `Campos: ${Object.keys(cambios).join(", ")}`,
        });
      }
      const actualizado = await detalleTaller(tx, id);
      if (!actualizado) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      return ok(actualizado);
    });
    return r;
  }
}

/** P3 Cambiar asesor con motivo: lo registrado se conserva, se avisa al nuevo. */
export class CambiarAsesorUseCase {
  async execute(
    id: string,
    input: { asesorDni: string; motivo: string },
    actor: Actor,
  ): Promise<Result<{ detalle: TallerDetalle; emailAsesor: string | null }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const detalle = await detalleTaller(tx, id);
      if (!detalle) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (detalle.estado !== "ACTIVO")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo un taller activo cambia de asesor"),
        );
      const a = await asesorPorDni(tx, input.asesorDni);
      if (!a)
        return fail(
          new DomainError("VALIDACION_FALLIDA", `Asesor DNI ${input.asesorDni} no existe`),
        );
      await tx.update(talleres).set({ asesorId: a.id }).where(eq(talleres.id, id));
      await appendAuditoriaTaller(tx, {
        tallerId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CAMBIAR_ASESOR",
        detalle: `Nuevo asesor DNI ${input.asesorDni}. Motivo: ${input.motivo.trim()}`,
      });
      const actualizado = await detalleTaller(tx, id);
      if (!actualizado) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      return ok({ detalle: actualizado, emailAsesor: a.email });
    });
    if (!r.ok) return r;
    if (r.value.emailAsesor) {
      await enqueueCorreo({
        para: [r.value.emailAsesor],
        asunto: `Te asignaron el taller ${r.value.detalle.nombre}`,
        titulo: "Nuevo taller a tu cargo",
        texto: "Desde Mis Talleres puedes ver tus alumnos, abrir asistencias y revisar avances.",
      });
    }
    return ok({ detalle: r.value.detalle, emailAsesor: r.value.emailAsesor });
  }
}

/** P1/P3 Cancelar: sin borrado; las pendientes se cancelan con el motivo. */
export class CancelarTallerUseCase {
  async execute(
    id: string,
    input: { motivo: string },
    actor: Actor,
  ): Promise<Result<TallerDetalle, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const detalle = await detalleTaller(tx, id);
      if (!detalle) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (detalle.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      await tx.update(talleres).set({ estado: "CANCELADO" }).where(eq(talleres.id, id));
      await tx
        .update(tallerSesiones)
        .set({ estado: "CANCELADA", motivo: "Taller cancelado" })
        .where(
          and(
            eq(tallerSesiones.tallerId, id),
            inArray(tallerSesiones.estado, ["PROGRAMADA", "ABIERTA"]),
          ),
        );
      await appendAuditoriaTaller(tx, {
        tallerId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CANCELAR_TALLER",
        detalle: `Motivo: ${input.motivo.trim()}`,
      });
      const actualizado = await detalleTaller(tx, id);
      if (!actualizado) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      return ok(actualizado);
    });
  }
}
