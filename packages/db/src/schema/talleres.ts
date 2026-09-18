import { integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoTallerEnum } from "./enums.js";
import { usuarios } from "./usuarios.js";

/** Talleres de tesis (INTERFACES §§11–12). */
export const talleres = pgTable("talleres", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  asesorId: uuid("asesor_id").references(() => usuarios.id),
  periodo: varchar("periodo", { length: 32 }),
  estado: estadoTallerEnum("estado").notNull().default("ACTIVO"),
  inscritos: integer("inscritos").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Taller = typeof talleres.$inferSelect;
