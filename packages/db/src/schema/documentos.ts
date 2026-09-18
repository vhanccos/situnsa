import { integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { estadoDocumentoEnum } from "./enums.js";
import { expedientes } from "./expedientes.js";

export const documentos = pgTable("documentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  expedienteId: uuid("expediente_id")
    .notNull()
    .references(() => expedientes.id),
  tipo: varchar("tipo", { length: 64 }).notNull(),
  ruta: text("ruta").notNull(),
  version: integer("version").notNull().default(1),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  estado: estadoDocumentoEnum("estado").notNull().default("CARGADO"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Documento = typeof documentos.$inferSelect;
