import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { expedientes } from "./expedientes.js";
import { usuarios } from "./usuarios.js";

/**
 * Cierre del trámite (Oleada D, RF-04…RF-07):
 * jurados (catálogo, pueden ser externos), designaciones por expediente con
 * dictamen, sustentación programada + acta, y validaciones institucionales
 * (una fila por instancia: OTI, repositorio, secretaría… SUNEDU).
 */

export const jurados = pgTable("jurados", {
  id: uuid("id").primaryKey().defaultRandom(),
  dni: varchar("dni", { length: 8 }).notNull().unique(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  grado: varchar("grado", { length: 16 }),
  email: varchar("email", { length: 255 }),
  activo: boolean("activo").notNull().default(true),
});

export const juradosExpediente = pgTable("jurados_expediente", {
  id: uuid("id").primaryKey().defaultRandom(),
  juradoId: uuid("jurado_id")
    .notNull()
    .references(() => jurados.id),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  /** TERNA = revisión del plan (E1); JURADO = jurado sorteado (E3–E4). */
  instancia: varchar("instancia", { length: 8 }).notNull().default("JURADO"),
  rol: varchar("rol", { length: 16 }).notNull().default("VOCAL"),
  dictamen: varchar("dictamen", { length: 16 }).notNull().default("PENDIENTE"),
  comentario: text("comentario"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sustentaciones = pgTable("sustentaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id)
    .unique(),
  fecha: varchar("fecha", { length: 32 }).notNull(),
  hora: varchar("hora", { length: 16 }).notNull(),
  lugar: text("lugar").notNull(),
  modalidad: varchar("modalidad", { length: 16 }).notNull().default("PRESENCIAL"),
  actaVeredicto: varchar("acta_veredicto", { length: 16 }),
  actaFecha: timestamp("acta_fecha", { withTimezone: true }),
});

/**
 * Rangos de fechas propuestos por el alumno para sustentar (HU-0038, RN-05.1).
 * Solo inserción: la propuesta vigente es la más reciente; las anteriores
 * quedan como historial de la renegociación (RN-05.2).
 */
export const propuestasSustentacion = pgTable(
  "propuestas_sustentacion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expedienteId: uuid("expediente_id")
      .notNull()
      .references(() => expedientes.id),
    desde: date("desde", { mode: "string" }).notNull(),
    hasta: date("hasta", { mode: "string" }).notNull(),
    comentario: text("comentario"),
    propuestaPor: uuid("propuesta_por").references(() => usuarios.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("propuestas_sustentacion_expediente_idx").on(t.expedienteId, t.createdAt),
    check("propuestas_sustentacion_rango", sql`${t.hasta} > ${t.desde}`),
  ],
);

export const validacionesInstitucionales = pgTable("validaciones_institucionales", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  instancia: varchar("instancia", { length: 32 }).notNull(),
  estado: varchar("estado", { length: 16 }).notNull().default("PENDIENTE"),
  /** % de similitud Turnitin (solo OTI_SIMILITUD, HU-0041/0042). */
  porcentaje: integer("porcentaje"),
  detalle: text("detalle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Jurado = typeof jurados.$inferSelect;
export type JuradoExpediente = typeof juradosExpediente.$inferSelect;
export type Sustentacion = typeof sustentaciones.$inferSelect;
export type PropuestaSustentacion = typeof propuestasSustentacion.$inferSelect;
export type ValidacionInstitucional = typeof validacionesInstitucionales.$inferSelect;
