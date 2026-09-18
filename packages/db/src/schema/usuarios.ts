import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rolUsuarioEnum } from "./enums.js";

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  dni: varchar("dni", { length: 8 }).notNull().unique(),
  cui: varchar("cui", { length: 16 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  rol: rolUsuarioEnum("rol").notNull(),
  telefono: varchar("telefono", { length: 20 }),
  nacionalidad: varchar("nacionalidad", { length: 64 }),
  ciudad: varchar("ciudad", { length: 64 }),
  direccion: text("direccion"),
  grado: varchar("grado", { length: 16 }),
  activo: boolean("activo").notNull().default(true),
  passwordHash: text("password_hash"),
  googleSub: text("google_sub"),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadoHasta: timestamp("bloqueado_hasta", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;
