import { jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoExpedienteEnum, modalidadEnum } from "./enums.js";
import { usuarios } from "./usuarios.js";

export const expedientes = pgTable("expedientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  codigo: varchar("codigo", { length: 32 }).notNull().unique(),
  estado: estadoExpedienteEnum("estado").notNull().default("REGISTRADO"),
  modalidad: modalidadEnum("modalidad").notNull(),
  programa: varchar("programa", { length: 160 }).notNull(),
  titulo: text("titulo").notNull(),
  participante1Id: uuid("participante1_id").references(() => usuarios.id),
  participante2Id: uuid("participante2_id").references(() => usuarios.id),
  asesorId: uuid("asesor_id").references(() => usuarios.id),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Expediente = typeof expedientes.$inferSelect;
export type NuevoExpediente = typeof expedientes.$inferInsert;
