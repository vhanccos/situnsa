import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { expedientes } from "./expedientes.js";

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

export const validacionesInstitucionales = pgTable("validaciones_institucionales", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  instancia: varchar("instancia", { length: 32 }).notNull(),
  estado: varchar("estado", { length: 16 }).notNull().default("PENDIENTE"),
  detalle: text("detalle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Jurado = typeof jurados.$inferSelect;
export type JuradoExpediente = typeof juradosExpediente.$inferSelect;
export type Sustentacion = typeof sustentaciones.$inferSelect;
export type ValidacionInstitucional = typeof validacionesInstitucionales.$inferSelect;
