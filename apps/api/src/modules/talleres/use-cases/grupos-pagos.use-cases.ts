import {
  cronogramaPensiones,
  db,
  grupoMiembros,
  gruposTaller,
  pagosTaller,
  talleres,
  usuarios,
} from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";

export interface Actor {
  id: string;
  dni: string;
}

/** Nuevo grupo de taller (HU-0011/0012): taller existente + asesor opcional. */
export class CrearGrupoUseCase {
  async execute(
    input: { tallerId: string; nombre: string; asesorDni?: string },
    _actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const nombre = input.nombre.trim();
    if (nombre.length < 3)
      return fail(new DomainError("VALIDACION_FALLIDA", "Nombre del grupo muy corto"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const t = await tx
        .select({ id: talleres.id })
        .from(talleres)
        .where(eq(talleres.id, input.tallerId))
        .limit(1);
      if (!t[0]) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      let asesorId: string | null = null;
      if (input.asesorDni) {
        const a = await tx
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(eq(usuarios.dni, input.asesorDni))
          .limit(1);
        if (!a[0])
          return fail(
            new DomainError("VALIDACION_FALLIDA", `Asesor DNI ${input.asesorDni} no existe`),
          );
        asesorId = a[0].id;
      }
      const inserted = await tx
        .insert(gruposTaller)
        .values({ tallerId: input.tallerId, nombre, asesorId })
        .returning({ id: gruposTaller.id });
      const g = inserted[0];
      if (!g) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo crear el grupo"));
      return ok({ id: g.id });
    });
  }
}

/** Asignación manual a grupo (HU-0011): usuario existente, sin duplicados. */
export class AgregarMiembroUseCase {
  async execute(
    grupoId: string,
    usuarioDni: string,
    _actor: Actor,
  ): Promise<Result<{ grupoId: string; usuarioId: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const g = await tx
        .select({ id: gruposTaller.id })
        .from(gruposTaller)
        .where(eq(gruposTaller.id, grupoId))
        .limit(1);
      if (!g[0]) return fail(new DomainError("NO_ENCONTRADO", "Grupo no encontrado"));
      const u = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.dni, usuarioDni))
        .limit(1);
      if (!u[0])
        return fail(new DomainError("VALIDACION_FALLIDA", `Usuario DNI ${usuarioDni} no existe`));
      const ya = await tx
        .select()
        .from(grupoMiembros)
        .where(and(eq(grupoMiembros.grupoId, grupoId), eq(grupoMiembros.usuarioId, u[0].id)))
        .limit(1);
      if (ya.length > 0)
        return fail(new DomainError("VALIDACION_FALLIDA", "El usuario ya es miembro del grupo"));
      await tx.insert(grupoMiembros).values({ grupoId, usuarioId: u[0].id });
      return ok({ grupoId, usuarioId: u[0].id });
    });
  }
}

/**
 * Cronograma de pensiones (HU-0014): N cuotas mensuales por miembro actual.
 * Falla si el grupo ya tiene cronograma (evita duplicados); reprogramar es P2.
 */
export class ProgramarPensionesUseCase {
  async execute(
    grupoId: string,
    input: { nroCuotas: number; monto: number; primerVencimiento: string },
    _actor: Actor,
  ): Promise<Result<{ grupoId: string; cuotas: number; miembros: number }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const g = await tx
        .select({ id: gruposTaller.id })
        .from(gruposTaller)
        .where(eq(gruposTaller.id, grupoId))
        .limit(1);
      if (!g[0]) return fail(new DomainError("NO_ENCONTRADO", "Grupo no encontrado"));
      const previas = await tx
        .select({ id: cronogramaPensiones.id })
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.grupoId, grupoId))
        .limit(1);
      if (previas.length > 0)
        return fail(
          new DomainError("VALIDACION_FALLIDA", "El grupo ya tiene cronograma programado"),
        );
      const miembros = await tx
        .select({ usuarioId: grupoMiembros.usuarioId })
        .from(grupoMiembros)
        .where(eq(grupoMiembros.grupoId, grupoId));
      if (miembros.length === 0)
        return fail(
          new DomainError("VALIDACION_FALLIDA", "El grupo no tiene miembros para programar"),
        );
      const base = new Date(`${input.primerVencimiento}T00:00:00`);
      if (Number.isNaN(base.getTime()))
        return fail(new DomainError("VALIDACION_FALLIDA", "Fecha de vencimiento inválida"));
      let cuotas = 0;
      for (const m of miembros) {
        for (let n = 1; n <= input.nroCuotas; n++) {
          const vto = new Date(base);
          vto.setMonth(vto.getMonth() + (n - 1));
          await tx.insert(cronogramaPensiones).values({
            grupoId,
            usuarioId: m.usuarioId,
            nroCuota: n,
            monto: input.monto,
            vencimiento: vto.toISOString().slice(0, 10),
            estado: "PENDIENTE",
          });
          cuotas++;
        }
      }
      return ok({ grupoId, cuotas, miembros: miembros.length });
    });
  }
}

/**
 * Registro de pago (HU-0015): cuota PENDIENTE, monto exacto (sin parciales;
 * el parcial es P2). Marca PAGADA en el mismo commit.
 */
export class RegistrarPagoUseCase {
  async execute(
    input: { cronogramaId: string; monto: number; medio: string; referencia?: string },
    actor: Actor,
  ): Promise<
    Result<
      { id: string; cronogramaId: string; monto: number; medio: string; estado: string },
      DomainError
    >
  > {
    if (input.monto <= 0)
      return fail(new DomainError("VALIDACION_FALLIDA", "El monto debe ser positivo"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const rows = await tx
        .select()
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.id, input.cronogramaId))
        .limit(1);
      const cuota = rows[0];
      if (!cuota) return fail(new DomainError("NO_ENCONTRADO", "Cuota no encontrada"));
      if (cuota.estado !== "PENDIENTE") {
        return fail(new DomainError("TRANSICION_INVALIDA", `La cuota ya está ${cuota.estado}`));
      }
      if (input.monto !== cuota.monto) {
        return fail(
          new DomainError(
            "VALIDACION_FALLIDA",
            `El pago debe ser exacto (cuota: S/ ${cuota.monto})`,
          ),
        );
      }
      const inserted = await tx
        .insert(pagosTaller)
        .values({
          cronogramaId: cuota.id,
          monto: input.monto,
          medio: input.medio,
          referencia: input.referencia ?? null,
          registradoPor: actor.id,
        })
        .returning({ id: pagosTaller.id });
      const pago = inserted[0];
      if (!pago) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar el pago"));
      await tx
        .update(cronogramaPensiones)
        .set({ estado: "PAGADA" })
        .where(eq(cronogramaPensiones.id, cuota.id));
      return ok({
        id: pago.id,
        cronogramaId: cuota.id,
        monto: input.monto,
        medio: input.medio,
        estado: "PAGADA",
      });
    });
  }
}
