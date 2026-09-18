import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { expedientes } from "./expedientes.js";
import { usuarios } from "./usuarios.js";

/** Mensajes administrativos visibles en Mi Trámite (§5) e Historial (§10). */
export const mensajes = pgTable("mensajes", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  autorId: uuid("autor_id").references(() => usuarios.id),
  texto: text("texto").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Mensaje = typeof mensajes.$inferSelect;
