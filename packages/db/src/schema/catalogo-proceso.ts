import { boolean, integer, pgTable, text, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Proceso configurable como datos (port S-FIPS ADR-0004, Oleada B3).
 * Siembra inicial = FLUJO_TITULACION actual (38 subetapas); el dominio lee
 * de aquí con fallback al catálogo en código. La UI admin editable es P2.
 */

export const catalogoEtapas = pgTable("catalogo_etapas", {
  id: uuid("id").primaryKey().defaultRandom(),
  numero: integer("numero").notNull().unique(),
  nombre: text("nombre").notNull(),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  activa: boolean("activa").notNull().default(true),
});

export const catalogoSubetapas = pgTable("catalogo_subetapas", {
  id: uuid("id").primaryKey().defaultRandom(),
  etapaNumero: integer("etapa_numero")
    .notNull()
    .references(() => catalogoEtapas.numero),
  orden: integer("orden").notNull(),
  nombre: text("nombre").notNull(),
  plazo: varchar("plazo", { length: 120 }),
  obligatoria: boolean("obligatoria").notNull().default(true),
});

export const catalogoDocsRequeridos = pgTable("catalogo_docs_requeridos", {
  id: uuid("id").primaryKey().defaultRandom(),
  etapa: varchar("etapa", { length: 8 }).notNull(),
  tipo: varchar("tipo", { length: 64 }).notNull().unique(),
  nombre: text("nombre").notNull(),
  obligatorio: boolean("obligatorio").notNull().default(true),
});

export type CatalogoEtapa = typeof catalogoEtapas.$inferSelect;
export type CatalogoSubetapa = typeof catalogoSubetapas.$inferSelect;
export type CatalogoDocRequerido = typeof catalogoDocsRequeridos.$inferSelect;
