import type { ErrorEnvelope } from "@pis/contracts";
import { db, expedientes, permisos, roles, rolesPermisos, usuarios, usuariosRoles } from "@pis/db";
import { and, eq } from "drizzle-orm";
import type { StubActor } from "../../middleware/stub-auth.js";
import { appendAuditoria } from "../../modules/expedientes/expedientes.auditoria.js";
import { errorEnvelope } from "../http/errores.js";

/**
 * Autorización (port S-FIPS + matriz ABAC pis):
 * permiso `modulo.accion` (denegación por defecto) × alcance por registro
 * (RN-06 tesista→propio, RN-07 asesor→asignados). El 403 por alcance se
 * audita con hash (criterio RNF-01: acceso cruzado entre asesores).
 */

export const ROL_ADMIN = "ADMIN_SISTEMA";
const ROLES_STAFF = new Set([
  "ADMIN_SISTEMA",
  "RESP_TITULACION",
  "RESP_AREA",
  "VALIDADOR_TALLER",
  "RESP_TALLER",
  "AUTORIDAD",
]);

export async function rolesDe(usuarioId: string): Promise<string[]> {
  const rows = await db
    .select({ nombre: roles.nombre })
    .from(usuariosRoles)
    .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
    .where(and(eq(usuariosRoles.usuarioId, usuarioId), eq(roles.activo, true)));
  return rows.map((r) => r.nombre);
}

/** ADMIN_SISTEMA lo tiene todo implícito; el resto nace sin permisos. */
export async function tienePermiso(
  usuarioId: string,
  modulo: string,
  accion: string,
): Promise<boolean> {
  const names = await rolesDe(usuarioId);
  if (names.includes(ROL_ADMIN)) return true;
  if (names.length === 0) return false;
  const rows = await db
    .select({ clave: permisos.clave })
    .from(usuariosRoles)
    .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
    .innerJoin(rolesPermisos, eq(rolesPermisos.rolId, roles.id))
    .innerJoin(permisos, eq(permisos.id, rolesPermisos.permisoId))
    .where(and(eq(usuariosRoles.usuarioId, usuarioId), eq(roles.activo, true)));
  const claves = new Set(rows.map((r) => r.clave));
  return claves.has(`${modulo}.${accion}`);
}

interface ExpedienteAlcance {
  id: string;
  estado: string;
  asesorId: string | null;
  dni1: string | null;
  dni2: string | null;
}

/** Decisión pura de alcance (testeable sin DB). */
export function decideAlcance(
  nombresRol: string[],
  actorDni: string,
  actorId: string,
  exp: ExpedienteAlcance,
): boolean {
  if (nombresRol.some((r) => ROLES_STAFF.has(r))) return true;
  if (nombresRol.includes("ASESOR") || nombresRol.includes("JURADO")) {
    return exp.asesorId !== null && exp.asesorId === actorId;
  }
  if (nombresRol.includes("TESISTA")) {
    return exp.dni1 === actorDni || exp.dni2 === actorDni;
  }
  return false;
}

async function expedienteParaAlcance(expedienteId: string): Promise<ExpedienteAlcance | null> {
  const rows = await db
    .select({
      id: expedientes.id,
      estado: expedientes.estado,
      asesorId: expedientes.asesorId,
      participante1Id: expedientes.participante1Id,
      participante2Id: expedientes.participante2Id,
    })
    .from(expedientes)
    .where(eq(expedientes.id, expedienteId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const gente = await db.select({ id: usuarios.id, dni: usuarios.dni }).from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u.dni]));
  return {
    id: row.id,
    estado: row.estado,
    asesorId: row.asesorId,
    dni1: row.participante1Id ? (porId.get(row.participante1Id) ?? null) : null,
    dni2: row.participante2Id ? (porId.get(row.participante2Id) ?? null) : null,
  };
}

export type Autorizacion =
  | { ok: true }
  | { ok: false; status: 401 | 403 | 404; body: ErrorEnvelope };

/** Retorno tipado para handlers ts-rest (narrowing por status). */
export function denegado(
  a: Extract<Autorizacion, { ok: false }>,
):
  | { status: 401; body: ErrorEnvelope }
  | { status: 403; body: ErrorEnvelope }
  | { status: 404; body: ErrorEnvelope } {
  if (a.status === 401) return { status: 401, body: a.body };
  if (a.status === 404) return { status: 404, body: a.body };
  return { status: 403, body: a.body };
}

/**
 * Uso en handlers ts-rest (requireAuth debe correr antes):
 * ```ts
 * const a = await autorizar(req.actor, { permiso: ["expedientes", "editar"], expedienteId: params.id });
 * if (!a.ok) return { status: a.status, body: a.body };
 * ```
 */
export async function autorizar(
  actor: StubActor | undefined,
  opts: { permiso: [string, string]; expedienteId?: string },
): Promise<Autorizacion> {
  if (!actor) {
    return {
      ok: false,
      status: 401,
      body: errorEnvelope("SIN_SESION", "Se requiere autenticación"),
    };
  }
  const [modulo, accion] = opts.permiso;
  if (!(await tienePermiso(actor.id, modulo, accion))) {
    return {
      ok: false,
      status: 403,
      body: errorEnvelope("SIN_PERMISO", `Se requiere permiso ${modulo}.${accion}`),
    };
  }
  if (opts.expedienteId) {
    const exp = await expedienteParaAlcance(opts.expedienteId);
    if (!exp) {
      return {
        ok: false,
        status: 404,
        body: errorEnvelope("NO_ENCONTRADO", "Expediente no encontrado"),
      };
    }
    const names = await rolesDe(actor.id);
    if (!decideAlcance(names, actor.dni, actor.id, exp)) {
      await appendAuditoria(db, {
        expedienteId: exp.id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: exp.estado,
        detalle: "Acceso denegado (fuera de alcance)",
      });
      return {
        ok: false,
        status: 403,
        body: errorEnvelope("FUERA_DE_ALCANCE", "El expediente no está en tu alcance"),
      };
    }
  }
  return { ok: true };
}
