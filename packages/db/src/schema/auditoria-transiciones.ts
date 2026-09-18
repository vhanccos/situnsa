import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { expedientes } from "./expedientes.js";

/** Tabla append-only con encadenamiento criptográfico (SHA-256 hash chaining). */
export const auditoriaTransiciones = pgTable("auditoria_transiciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  actorId: uuid("actor_id"),
  estadoAnterior: varchar("estado_anterior", { length: 32 }),
  estadoNuevo: varchar("estado_nuevo", { length: 32 }).notNull(),
  hashPrevio: varchar("hash_previo", { length: 64 }),
  hash: varchar("hash", { length: 64 }).notNull(),
  detalle: text("detalle"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type AuditoriaTransicion = typeof auditoriaTransiciones.$inferSelect;
