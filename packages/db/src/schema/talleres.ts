import { date, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoTallerEnum } from "./enums.js";
import { usuarios } from "./usuarios.js";

/** Talleres de tesis P1–P3 (programación + cupo + enlace). */
export const talleres = pgTable("talleres", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: varchar("nombre", { length: 160 }).notNull(),
  asesorId: uuid("asesor_id").references(() => usuarios.id),
  periodo: varchar("periodo", { length: 32 }),
  estado: estadoTallerEnum("estado").notNull().default("ACTIVO"),
  inscritos: integer("inscritos").notNull().default(0),
  /** P2: fecha de la primera sesión posible (AAAA-MM-DD). */
  fechaInicio: date("fecha_inicio"),
  /** P2: días ISO de sesión en CSV ("6,7" = sáb y dom). */
  diasSesion: varchar("dias_sesion", { length: 16 }),
  horaInicio: varchar("hora_inicio", { length: 5 }),
  horaFin: varchar("hora_fin", { length: 5 }),
  cupoMax: integer("cupo_max"),
  /** P2: enlace de reunión opcional (https). */
  enlace: varchar("enlace", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Taller = typeof talleres.$inferSelect;
