import { db } from "./client.js";
import { expedientes } from "./schema/expedientes.js";
import { usuarios } from "./schema/usuarios.js";

/**
 * Seed de datos maestros: 13 programas oficiales FIPS + usuarios base.
 * Uso: pnpm --filter @pis/db db:seed (requiere Postgres levantado).
 */
const PROGRAMAS = [
  "Ingeniería de Sistemas",
  "Ingeniería Industrial",
  "Ingeniería de Industrias Alimentarias",
  "Segunda Especialidad en Ingeniería de Sistemas",
  "Segunda Especialidad en Ingeniería Industrial",
  "Maestría en Ingeniería de Sistemas",
  "Maestría en Ingeniería Industrial",
  "Doctorado en Ingeniería de Sistemas",
  "Doctorado en Ingeniería Industrial",
  "Diplomado en Gestión de Proyectos",
  "Diplomado en Ciencia de Datos",
  "Programa de Titulación por Tesis",
  "Programa de Titulación por Trabajo Académico",
] as const;

async function main(): Promise<void> {
  console.log(`Programas oficiales FIPS (${PROGRAMAS.length}):`);
  for (const p of PROGRAMAS) console.log(` - ${p}`);

  await db
    .insert(usuarios)
    .values([
      {
        dni: "00000001",
        email: "angela@unsa.edu.pe",
        nombres: "Angela",
        apellidos: "Administrativa FIPS",
        rol: "ADMIN_FIPS",
      },
      {
        dni: "00000002",
        email: "magnolia@unsa.edu.pe",
        nombres: "Magnolia",
        apellidos: "Secretaría FIPS",
        rol: "SECRETARIA",
      },
      {
        dni: "12345678",
        cui: "2020123456",
        email: "tesista.prueba@unsa.edu.pe",
        nombres: "Tesista",
        apellidos: "Prueba",
        rol: "TESISTA",
      },
    ])
    .onConflictDoNothing({ target: usuarios.dni });

  const rows = await db.select({ codigo: expedientes.codigo }).from(expedientes);
  console.log(`Seed OK. Expedientes existentes: ${rows.length}`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
