import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { rolUsuarioEnum } from "./enums.js";

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  dni: varchar("dni", { length: 8 }).notNull().unique(),
  cui: varchar("cui", { length: 16 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  nombres: text("nombres").notNull(),
  apellidos: text("apellidos").notNull(),
  rol: rolUsuarioEnum("rol").notNull(),
  passwordHash: text("password_hash"),
  googleSub: text("google_sub"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Usuario = typeof usuarios.$inferSelect;
export type NuevoUsuario = typeof usuarios.$inferInsert;
