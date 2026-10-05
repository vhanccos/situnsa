import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { expedientes } from "./expedientes.js";

/** Tabla append-only con encadenamiento criptográfico (SHA-256 hash chaining). */
export const auditoriaTransiciones = pgTable(
  "auditoria_transiciones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expedienteId: uuid("expediente_id")
      .notNull()
      .references(() => expedientes.id),
    actorId: uuid("actor_id"),
    /** DNI del actor tal como entra en el hash ("sistema" sin actor): permite re-verificar la cadena. */
    actorDni: varchar("actor_dni", { length: 32 }),
    estadoAnterior: varchar("estado_anterior", { length: 32 }),
    estadoNuevo: varchar("estado_nuevo", { length: 32 }).notNull(),
    hashPrevio: varchar("hash_previo", { length: 64 }),
    hash: varchar("hash", { length: 64 }).notNull(),
    detalle: text("detalle"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("auditoria_transiciones_expediente_idx").on(t.expedienteId, t.createdAt)],
);

export type AuditoriaTransicion = typeof auditoriaTransiciones.$inferSelect;
