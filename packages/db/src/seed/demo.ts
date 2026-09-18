import { FLUJO_TITULACION } from "@pis/domain";
import { eq } from "drizzle-orm";
import type { Db } from "../client.js";
import { expedientes } from "../schema/expedientes.js";
import { mensajes } from "../schema/mensajes.js";
import { subetapas } from "../schema/subetapas.js";
import { talleres } from "../schema/talleres.js";
import { usuarios } from "../schema/usuarios.js";

export const TESISTA_ID = "11111111-1111-4111-8111-111111111111";
export const ASESOR_ID = "22222222-2222-4222-8222-222222222222";
export const ADMIN_ID = "44444444-4444-4444-8444-444444444444";
export const EXPEDIENTE_ID = "33333333-3333-4333-8333-333333333333";

/**
 * Seed DEMO (idempotente, SOLO dev/e2e): usuarios de prueba, SET005 con sus
 * 38 subetapas, 1 mensaje y 3 talleres. Nunca en prod (datos ficticios).
 */
export async function seedDemo(db: Db): Promise<void> {
  await db
    .insert(usuarios)
    .values([
      {
        id: ADMIN_ID,
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
        nacionalidad: "Peruana",
        ciudad: "Arequipa",
        rol: "TESISTA",
      },
      {
        id: ASESOR_ID,
        dni: "87654321",
        email: "asesor.prueba@unsa.edu.pe",
        nombres: "Asesor",
        apellidos: "Prueba",
        grado: "Dr.",
        telefono: "999111222",
        rol: "ASESOR",
      },
    ])
    .onConflictDoNothing({ target: usuarios.dni });
  await db.update(usuarios).set({ id: TESISTA_ID }).where(eq(usuarios.dni, "12345678"));
  await db
    .update(usuarios)
    .set({ id: ASESOR_ID, grado: "Dr.", telefono: "999111222" })
    .where(eq(usuarios.dni, "87654321"));
  await db.update(usuarios).set({ id: ADMIN_ID }).where(eq(usuarios.dni, "00000001"));

  await db
    .insert(expedientes)
    .values([
      {
        id: EXPEDIENTE_ID,
        codigo: "SET005",
        estado: "EN_PLAN",
        modalidad: "TESIS",
        programa: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS",
        titulo: "Sistema de titulación FIPS con trazabilidad criptográfica",
        participante1Id: TESISTA_ID,
        asesorId: ASESOR_ID,
        nroDecreto: "007",
        presidente: "DR. PRESIDENTE TERNA",
        secretario: "MG. SECRETARIO TERNA",
        fechaApertura: "2026-09-01",
        fechaPresentacion: "2026-09-10",
        nroOficio: "OF-2026-042",
      },
    ])
    .onConflictDoNothing({ target: expedientes.codigo });

  const existentes = await db.select({ id: subetapas.id }).from(subetapas);
  if (existentes.length === 0) {
    for (const etapa of FLUJO_TITULACION) {
      for (const s of etapa.subetapas) {
        const primera = etapa.numero === 1 && s.orden === 1;
        await db.insert(subetapas).values({
          expedienteId: EXPEDIENTE_ID,
          etapa: etapa.numero,
          orden: s.orden,
          nombre: s.nombre,
          plazo: s.plazo,
          estado: primera ? "EN_CURSO" : "NO_INICIADO",
          responsable: etapa.responsable,
          inicio: primera ? new Date() : null,
        });
      }
    }
    console.log("Seguimiento SET005: 38 subetapas (E1.1 en curso)");
  }

  const msgs = await db.select({ id: mensajes.id }).from(mensajes);
  if (msgs.length === 0) {
    await db.insert(mensajes).values({
      expedienteId: EXPEDIENTE_ID,
      autorId: ADMIN_ID,
      texto: "FALTA CORREGIR LOS OBJETIVOS ESPECÍFICOS",
    });
  }

  const tall = await db.select({ id: talleres.id }).from(talleres);
  if (tall.length === 0) {
    await db.insert(talleres).values([
      { nombre: "TALLER 04", asesorId: ASESOR_ID, periodo: "2025-II", inscritos: 32 },
      { nombre: "TALLER DE TESIS 05", asesorId: ASESOR_ID, periodo: "2025-II", inscritos: 34 },
      { nombre: "TALLER 07", asesorId: ASESOR_ID, periodo: "2026-I", inscritos: 24 },
    ]);
  }

  const rows = await db.select({ codigo: expedientes.codigo }).from(expedientes);
  console.log(`Seed demo OK. Expedientes: ${rows.map((r) => r.codigo).join(", ")}`);
}
