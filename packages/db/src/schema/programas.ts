import { pgTable, text, varchar } from "drizzle-orm/pg-core";

/** 13 programas oficiales FIPS (legacy 96_BD_ProgramasOficialesV189). */
export const programas = pgTable("programas", {
  codigo: varchar("codigo", { length: 16 }).primaryKey(),
  nombre: text("nombre").notNull(),
});

export type Programa = typeof programas.$inferSelect;
