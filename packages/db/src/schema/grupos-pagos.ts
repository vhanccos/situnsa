import { date, integer, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoCuotaEnum, estadoGrupoEnum } from "./enums.js";
import { talleres } from "./talleres.js";
import { usuarios } from "./usuarios.js";

/**
 * Taller operativo (Oleada C, HU-0011/12/14/15):
 * grupos con asesor y miembros + cronograma de pensiones + pagos.
 * Montos en soles enteros (integer) para evitar decimales.
 */

export const gruposTaller = pgTable("grupos_taller", {
  id: uuid("id").primaryKey().defaultRandom(),
  tallerId: uuid("taller_id")
    .notNull()
    .references(() => talleres.id),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  asesorId: uuid("asesor_id").references(() => usuarios.id),
  estado: estadoGrupoEnum("estado").notNull().default("PLANIFICADO"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const grupoMiembros = pgTable(
  "grupo_miembros",
  {
    grupoId: uuid("grupo_id")
      .notNull()
      .references(() => gruposTaller.id),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id),
  },
  (t) => [primaryKey({ columns: [t.grupoId, t.usuarioId] })],
);

export const cronogramaPensiones = pgTable("cronograma_pensiones", {
  id: uuid("id").primaryKey().defaultRandom(),
  grupoId: uuid("grupo_id")
    .notNull()
    .references(() => gruposTaller.id),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  nroCuota: integer("nro_cuota").notNull(),
  monto: integer("monto").notNull(),
  vencimiento: date("vencimiento").notNull(),
  estado: estadoCuotaEnum("estado").notNull().default("PENDIENTE"),
});

export const pagosTaller = pgTable("pagos_taller", {
  id: uuid("id").primaryKey().defaultRandom(),
  cronogramaId: uuid("cronograma_id")
    .notNull()
    .references(() => cronogramaPensiones.id),
  monto: integer("monto").notNull(),
  medio: varchar("medio", { length: 32 }).notNull().default("CAJA"),
  referencia: varchar("referencia", { length: 64 }),
  registradoPor: uuid("registrado_por").references(() => usuarios.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type GrupoTaller = typeof gruposTaller.$inferSelect;
export type CronogramaPension = typeof cronogramaPensiones.$inferSelect;
export type PagoTaller = typeof pagosTaller.$inferSelect;
