import {
  cronogramaPensiones,
  type DbExecutor,
  expedientes,
  grupoMiembros,
  gruposTaller,
  talleres,
  tallerSesiones,
  usuarios,
} from "@pis/db";
import { and, eq, inArray, ne } from "drizzle-orm";

/**
 * Alcance del taller (RN-07 + Fase A del spec §2):
 * el personal ve todo; el asesor solo sus talleres; el tesista solo el suyo.
 * Funciones puras de lectura sobre `DbExecutor` (sirven en rutas y use-cases).
 */

export interface TallerBase {
  id: string;
  estado: string;
  asesorId: string | null;
  cupoMax: number | null;
}

export async function tallerPorId(db: DbExecutor, tallerId: string): Promise<TallerBase | null> {
  const rows = await db
    .select({
      id: talleres.id,
      estado: talleres.estado,
      asesorId: talleres.asesorId,
      cupoMax: talleres.cupoMax,
    })
    .from(talleres)
    .where(eq(talleres.id, tallerId))
    .limit(1);
  return rows[0] ?? null;
}

/** Grupos del taller con sus miembros (una fila por miembro). */
export async function miembrosDelTaller(
  db: DbExecutor,
  tallerId: string,
): Promise<Array<{ grupoId: string; usuarioId: string }>> {
  const grupos = await db
    .select({ id: gruposTaller.id })
    .from(gruposTaller)
    .where(eq(gruposTaller.tallerId, tallerId));
  if (grupos.length === 0) return [];
  return db
    .select({ grupoId: grupoMiembros.grupoId, usuarioId: grupoMiembros.usuarioId })
    .from(grupoMiembros)
    .where(
      inArray(
        grupoMiembros.grupoId,
        grupos.map((g) => g.id),
      ),
    );
}

export async function usuarioEnTaller(
  db: DbExecutor,
  tallerId: string,
  usuarioId: string,
): Promise<string | null> {
  const miembros = await miembrosDelTaller(db, tallerId);
  return miembros.find((m) => m.usuarioId === usuarioId)?.grupoId ?? null;
}

export async function tallerActivoDe(db: DbExecutor, usuarioId: string): Promise<string | null> {
  const membresias = await db
    .select({ grupoId: grupoMiembros.grupoId })
    .from(grupoMiembros)
    .where(eq(grupoMiembros.usuarioId, usuarioId));
  if (membresias.length === 0) return null;
  const filas = await db
    .select({ tallerId: gruposTaller.tallerId, estado: talleres.estado })
    .from(gruposTaller)
    .innerJoin(talleres, eq(talleres.id, gruposTaller.tallerId))
    .where(
      inArray(
        gruposTaller.id,
        membresias.map((m) => m.grupoId),
      ),
    );
  return filas.find((f) => f.estado === "ACTIVO")?.tallerId ?? null;
}

/**
 * P3: el alumno debe tener su inscripción validada (expediente más allá
 * de REGISTRADO y no anulado). Devuelve el id de usuario o null.
 */
export async function alumnoValidadoPorDni(
  db: DbExecutor,
  dni: string,
): Promise<{ id: string; email: string; nombres: string } | null> {
  const gente = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios)
    .where(eq(usuarios.dni, dni))
    .limit(1);
  const u = gente[0];
  if (!u) return null;
  const exps = await db
    .select({ id: expedientes.id })
    .from(expedientes)
    .where(
      and(
        eq(expedientes.participante1Id, u.id),
        ne(expedientes.estado, "REGISTRADO"),
        ne(expedientes.estado, "ANULADO"),
      ),
    )
    .limit(1);
  if (exps.length === 0) {
    const exps2 = await db
      .select({ id: expedientes.id })
      .from(expedientes)
      .where(
        and(
          eq(expedientes.participante2Id, u.id),
          ne(expedientes.estado, "REGISTRADO"),
          ne(expedientes.estado, "ANULADO"),
        ),
      )
      .limit(1);
    if (exps2.length === 0) return null;
  }
  return { id: u.id, email: u.email, nombres: `${u.nombres} ${u.apellidos}` };
}

/** Cuotas con cronograma del grupo (para clonar al asignar tardíamente). */
export async function cronogramaDelGrupo(
  db: DbExecutor,
  grupoId: string,
): Promise<Array<{ nroCuota: number; monto: number; vencimiento: string }>> {
  const rows = await db
    .select({
      nroCuota: cronogramaPensiones.nroCuota,
      monto: cronogramaPensiones.monto,
      vencimiento: cronogramaPensiones.vencimiento,
    })
    .from(cronogramaPensiones)
    .where(eq(cronogramaPensiones.grupoId, grupoId));
  const vistos = new Map<number, { nroCuota: number; monto: number; vencimiento: string }>();
  for (const r of rows) {
    if (!vistos.has(r.nroCuota)) vistos.set(r.nroCuota, r);
  }
  return [...vistos.values()].sort((a, b) => a.nroCuota - b.nroCuota);
}

export async function sesionesDelTaller(
  db: DbExecutor,
  tallerId: string,
): Promise<Array<{ id: string; estado: string }>> {
  return db
    .select({ id: tallerSesiones.id, estado: tallerSesiones.estado })
    .from(tallerSesiones)
    .where(eq(tallerSesiones.tallerId, tallerId));
}
