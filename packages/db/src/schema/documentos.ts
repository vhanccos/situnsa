import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { estadoDocumentoEnum } from "./enums.js";
import { expedientes } from "./expedientes.js";

export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  etapa: varchar("etapa", { length: 8 }).notNull().default("E1"),
  ruta: text("ruta").notNull(),
  version: integer("version").notNull().default(1),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  estado: estadoDocumentoEnum("estado").notNull().default("CARGADO"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Documento = typeof documentos.$inferSelect;

/**
 * Formatos generados por el sistema (HU-0017/0018/0020/0030 · botón
 * "Insertar datos"): uno vigente por expediente y tipo, con las etiquetas
 * que quedaron pendientes. No reemplaza al documento firmado que se carga.
 */
export const documentosGenerados = pgTable(
  "documentos_generados",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    expedienteId: uuid("expediente_id")
      .notNull()
      .references(() => expedientes.id),
    tipo: varchar("tipo", { length: 64 }).notNull(),
    etapa: varchar("etapa", { length: 8 }).notNull(),
    ruta: text("ruta").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    version: integer("version").notNull().default(1),
    versionPlantilla: varchar("version_plantilla", { length: 16 }).notNull(),
    pendientes: jsonb("pendientes").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("documentos_generados_expediente_tipo").on(t.expedienteId, t.tipo)],
);

export type DocumentoGenerado = typeof documentosGenerados.$inferSelect;
