import { hashSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { permisos, roles, rolesPermisos, usuariosRoles } from "../schema/seguridad.js";
import { usuarios } from "../schema/usuarios.js";

/** Módulos del sistema (S-FIPS shared/permisos.ts). */
export const MODULOS = [
  "seguridad",
  "inscripciones",
  "taller",
  "pagos",
  "expedientes",
  "documentos",
  "seguimiento",
  "portal_alumno",
  "portal_asesor",
  "aprobaciones",
  "sustentacion",
  "validaciones",
  "notificaciones",
  "auditoria",
  "reportes",
] as const;

export const ACCIONES = ["ver", "crear", "editar", "eliminar", "aprobar", "exportar"] as const;

export type Modulo = (typeof MODULOS)[number];
export type Accion = (typeof ACCIONES)[number];
export type ClavePermiso = `${Modulo}.${Accion}`;

interface DefRol {
  nombre: string;
  descripcion: string;
  esSistema: boolean;
  /** Claves `modulo.accion`; "*" = todos (solo ADMIN_SISTEMA, implícito). */
  permisos: ClavePermiso[] | "*";
}

/**
 * Roles del sistema (matriz ABAC docs/02-domain/permissions-matrix.md
 * traducida a permisos `modulo.accion` S-FIPS).
 */
export const ROLES_SISTEMA: DefRol[] = [
  {
    nombre: "ADMIN_SISTEMA",
    descripcion: "TI: acceso total implícito, no puede quedarse sin permisos",
    esSistema: true,
    permisos: "*",
  },
  {
    nombre: "RESP_TITULACION",
    descripcion: "Angela/Magnolia E1–E2: expedientes, terna, decretos",
    esSistema: true,
    permisos: [
      "expedientes.ver",
      "expedientes.crear",
      "expedientes.editar",
      "sustentacion.ver",
      "sustentacion.crear",
      "documentos.ver",
      "seguimiento.ver",
      "seguimiento.crear",
      "seguimiento.editar",
      "seguimiento.aprobar",
      "inscripciones.ver",
      "inscripciones.aprobar",
      "taller.ver",
      "notificaciones.ver",
      "notificaciones.crear",
      "reportes.ver",
      "auditoria.ver",
    ],
  },
  {
    nombre: "RESP_AREA",
    descripcion: "fips_usesp@ E3–E7: sorteos, sustentaciones, validaciones",
    esSistema: true,
    permisos: [
      "expedientes.ver",
      "expedientes.editar",
      "documentos.ver",
      "seguimiento.ver",
      "seguimiento.crear",
      "seguimiento.editar",
      "seguimiento.aprobar",
      "sustentacion.ver",
      "sustentacion.crear",
      "sustentacion.editar",
      "sustentacion.aprobar",
      "validaciones.ver",
      "validaciones.aprobar",
      "aprobaciones.ver",
      "aprobaciones.aprobar",
      "reportes.ver",
      "reportes.exportar",
      "notificaciones.ver",
      "notificaciones.crear",
      "auditoria.ver",
    ],
  },
  {
    nombre: "VALIDADOR_TALLER",
    descripcion: "Revisión/validación de inscripciones y asignación a grupo",
    esSistema: true,
    permisos: [
      "inscripciones.ver",
      "inscripciones.aprobar",
      "taller.ver",
      "expedientes.ver",
      "notificaciones.ver",
    ],
  },
  {
    nombre: "RESP_TALLER",
    descripcion: "Coordinación: grupos, periodos, asesores, pensiones",
    esSistema: true,
    permisos: [
      "taller.ver",
      "taller.crear",
      "taller.editar",
      "pagos.ver",
      "pagos.crear",
      "pagos.editar",
      "inscripciones.ver",
      "reportes.ver",
      "notificaciones.ver",
      "notificaciones.crear",
    ],
  },
  {
    nombre: "ASESOR",
    descripcion: "Solo asignados: revisar, observar, V°B° (RN-07/RN-08)",
    esSistema: true,
    permisos: [
      "portal_asesor.ver",
      "expedientes.ver",
      "documentos.ver",
      "documentos.aprobar",
      "seguimiento.ver",
      "sustentacion.ver",
      "notificaciones.ver",
    ],
  },
  {
    nombre: "JURADO",
    descripcion: "Terna/jurados: revisar y dictaminar lo asignado",
    esSistema: true,
    permisos: [
      "expedientes.ver",
      "documentos.ver",
      "sustentacion.ver",
      "seguimiento.ver",
      "auditoria.ver",
      "notificaciones.ver",
    ],
  },
  {
    nombre: "TESISTA",
    descripcion: "Portal propio: ver expediente, cargar en subetapa activa (RN-06)",
    esSistema: true,
    permisos: [
      "portal_alumno.ver",
      "portal_alumno.crear",
      "expedientes.ver",
      "documentos.ver",
      "documentos.crear",
      "seguimiento.ver",
      "sustentacion.ver",
      "pagos.ver",
      "notificaciones.ver",
    ],
  },
  {
    nombre: "AUTORIDAD",
    descripcion: "Director/Decano/Secretaría/Consejo: firmas de su instancia",
    esSistema: true,
    permisos: [
      "aprobaciones.ver",
      "aprobaciones.aprobar",
      "validaciones.ver",
      "validaciones.aprobar",
      "expedientes.ver",
      "reportes.ver",
      "reportes.exportar",
    ],
  },
  {
    nombre: "INVITADO",
    descripcion: "Público: invitación de sustentación (lectura mínima)",
    esSistema: true,
    permisos: [],
  },
];

/** Rol legacy `usuarios.rol` → roles nuevos (migración de alcance). */
export const MAPA_ROL_LEGACY: Record<string, string[]> = {
  ADMIN_FIPS: ["ADMIN_SISTEMA", "RESP_TITULACION"],
  SECRETARIA: ["RESP_TITULACION"],
  DECANO: ["AUTORIDAD"],
  ASESOR: ["ASESOR"],
  JURADO: ["JURADO"],
  TESISTA: ["TESISTA"],
  INVITADO: ["INVITADO"],
};

/** Seed SEGURIDAD (idempotente, seguro en prod): roles + 90 permisos + grants. */
export async function seedSeguridad(db: Db): Promise<void> {
  for (const r of ROLES_SISTEMA) {
    await db
      .insert(roles)
      .values({ nombre: r.nombre, descripcion: r.descripcion, esSistema: r.esSistema })
      .onConflictDoNothing({ target: roles.nombre });
  }
  for (const modulo of MODULOS) {
    for (const accion of ACCIONES) {
      await db
        .insert(permisos)
        .values({ modulo, accion, clave: `${modulo}.${accion}` })
        .onConflictDoNothing({ target: permisos.clave });
    }
  }
  const todosRoles = await db.select().from(roles);
  const todosPermisos = await db.select().from(permisos);
  const rolPorNombre = new Map(todosRoles.map((r) => [r.nombre, r.id]));
  const permisoPorClave = new Map(todosPermisos.map((p) => [p.clave, p.id]));
  for (const r of ROLES_SISTEMA) {
    if (r.permisos === "*") continue;
    const rolId = rolPorNombre.get(r.nombre);
    if (!rolId) continue;
    for (const clave of r.permisos) {
      const permisoId = permisoPorClave.get(clave);
      if (!permisoId) continue;
      await db.insert(rolesPermisos).values({ rolId, permisoId }).onConflictDoNothing();
    }
  }
  console.log(`Roles (${ROLES_SISTEMA.length}) + permisos (${MODULOS.length * ACCIONES.length})`);
}

/**
 * Asigna roles nuevos según el `rol` legacy de cada usuario existente.
 * Idempotente; seguro donde haya usuarios reales (solo agrega lo mapeado).
 */
export async function asignarRolesLegacy(db: Db): Promise<void> {
  const todosRoles = await db.select().from(roles);
  const rolPorNombre = new Map(todosRoles.map((r) => [r.nombre, r.id]));
  const gente = await db.select({ id: usuarios.id, rol: usuarios.rol }).from(usuarios);
  for (const u of gente) {
    const destinos = MAPA_ROL_LEGACY[u.rol] ?? [];
    for (const nombre of destinos) {
      const rolId = rolPorNombre.get(nombre);
      if (!rolId) continue;
      await db.insert(usuariosRoles).values({ usuarioId: u.id, rolId }).onConflictDoNothing();
    }
  }
}

/** Clave demo/dev (solo seed demo, nunca prod). Documentada en README. */
export function claveDemo(): string {
  return process.env.DEMO_PASSWORD ?? "x";
}

/** Fija el hash bcrypt (coste 12, S-FIPS) a los usuarios demo indicados. */
export async function fijarClavesDemo(db: Db, dnis: string[]): Promise<void> {
  const hash = hashSync(claveDemo(), 12);
  for (const dni of dnis) {
    await db
      .update(usuarios)
      .set({ passwordHash: hash, intentosFallidos: 0, bloqueadoHasta: null })
      .where(eq(usuarios.dni, dni));
  }
}
