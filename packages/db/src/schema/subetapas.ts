import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoSubetapaEnum } from "./enums.js";
import { expedientes } from "./expedientes.js";

/** Seguimiento: una fila por subetapa del FLUJO_TITULACION (INTERFACES §9). */
export const subetapas = pgTable("subetapas", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  etapa: integer("etapa").notNull(),
  orden: integer("orden").notNull(),
  nombre: text("nombre").notNull(),
  plazo: varchar("plazo", { length: 120 }),
  estado: estadoSubetapaEnum("estado").notNull().default("NO_INICIADO"),
  responsable: varchar("responsable", { length: 255 }),
  inicio: timestamp("inicio", { withTimezone: true }),
  fin: timestamp("fin", { withTimezone: true }),
});

export type Subetapa = typeof subetapas.$inferSelect;
