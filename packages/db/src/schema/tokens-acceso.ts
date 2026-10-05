import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios.js";

/**
 * Enlaces de un solo uso para activar la cuenta o restablecer la clave
 * (HU-0002, portal del tesista). Solo se guarda el SHA-256 del token; el
 * token en claro viaja únicamente en el correo.
 */
export const tokensAcceso = pgTable("tokens_acceso", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  proposito: varchar("proposito", { length: 16 }).notNull().default("ACTIVACION"),
  expiraAt: timestamp("expira_at", { withTimezone: true }).notNull(),
  usadoAt: timestamp("usado_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TokenAcceso = typeof tokensAcceso.$inferSelect;

/** Vigencia del enlace de activación. */
export const TOKEN_ACCESO_HORAS = 72;
