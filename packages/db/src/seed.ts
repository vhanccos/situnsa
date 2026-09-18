import { eq } from "drizzle-orm";
import { db } from "./client.js";
import { expedientes } from "./schema/expedientes.js";
import { usuarios } from "./schema/usuarios.js";

/**
 * Seed de datos maestros + expediente demo SET005 (ids fijos para e2e/dev estable).
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

const TESISTA_ID = "11111111-1111-4111-8111-111111111111";
const ASESOR_ID = "22222222-2222-4222-8222-222222222222";
const EXPEDIENTE_ID = "33333333-3333-4333-8333-333333333333";

async function main(): Promise<void> {
  console.log(`Programas oficiales FIPS (${PROGRAMAS.length})`);

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
        id: TESISTA_ID,
        dni: "12345678",
        cui: "2020123456",
        email: "tesista.prueba@unsa.edu.pe",
        nombres: "Tesista",
        apellidos: "Prueba",
        telefono: "999888777",
        rol: "TESISTA",
      },
      {
        id: ASESOR_ID,
        dni: "87654321",
        email: "asesor.prueba@unsa.edu.pe",
        nombres: "Asesor",
        apellidos: "Prueba",
        rol: "ASESOR",
      },
    ])
    .onConflictDoNothing({ target: usuarios.dni });

  // Fija ids estables aunque el seed ya hubiera corrido con ids aleatorios.
  await db.update(usuarios).set({ id: TESISTA_ID }).where(eq(usuarios.dni, "12345678"));
  await db.update(usuarios).set({ id: ASESOR_ID }).where(eq(usuarios.dni, "87654321"));

  await db
    .insert(expedientes)
    .values([
      {
        id: EXPEDIENTE_ID,
        codigo: "SET005",
        estado: "EN_PLAN",
        modalidad: "TESIS",
        programa: "Segunda Especialidad en Ingeniería de Sistemas",
        titulo: "Sistema de titulación FIPS con trazabilidad criptográfica",
        participante1Id: TESISTA_ID,
        asesorId: ASESOR_ID,
      },
    ])
    .onConflictDoNothing({ target: expedientes.codigo });

  const rows = await db.select({ codigo: expedientes.codigo }).from(expedientes);
  console.log(`Seed OK. Expedientes: ${rows.map((r) => r.codigo).join(", ")}`);
  process.exit(0);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
