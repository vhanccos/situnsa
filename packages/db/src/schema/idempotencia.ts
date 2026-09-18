import { jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Claves de idempotencia (port S-FIPS API.md `Idempotency-Key`).
 * Solo creaciones críticas (inscribir-plan): si el cliente reintenta con la
 * misma clave en 24h, se devuelve la respuesta original sin re-ejecutar.
 */
export const idempotencyKeys = pgTable("idempotency_keys", {
  clave: varchar("clave", { length: 64 }).primaryKey(),
  metodo: varchar("metodo", { length: 8 }).notNull(),
  ruta: text("ruta").notNull(),
  respuesta: jsonb("respuesta").notNull(),
  estado: varchar("estado", { length: 8 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiraAt: timestamp("expira_at", { withTimezone: true }).notNull(),
});

export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
