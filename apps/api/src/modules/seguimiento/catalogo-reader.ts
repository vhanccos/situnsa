import { catalogoEtapas, catalogoSubetapas, db as conexion, type DbExecutor } from "@pis/db";
import { FLUJO_TITULACION } from "@pis/domain";
import { asc, eq } from "drizzle-orm";
import { leerChecklist } from "../expedientes/expedientes.repository.js";

export interface SubetapaFlujo {
  orden: number;
  /** null = subetapa personalizada (HU-0052), sin reglas de avance. */
  clave: string | null;
  nombre: string;
  plazo: string;
}

export interface EtapaFlujo {
  numero: number;
  nombre: string;
  responsable: string;
  subetapas: SubetapaFlujo[];
}

function desdeCodigo(): EtapaFlujo[] {
  return FLUJO_TITULACION.map((e) => ({
    numero: e.numero,
    nombre: e.nombre,
    responsable: e.responsable,
    subetapas: e.subetapas.map((s) => ({
      orden: s.orden,
      clave: s.clave,
      nombre: s.nombre,
      plazo: s.plazo,
    })),
  }));
}

/**
 * Catálogo del proceso desde DB (editable, HU-0052) con fallback al código
 * si la tabla está vacía. Solo etapas activas.
 */
export async function obtenerFlujo(db: DbExecutor = conexion): Promise<EtapaFlujo[]> {
  const etapas = await db
    .select()
    .from(catalogoEtapas)
    .where(eq(catalogoEtapas.activa, true))
    .orderBy(asc(catalogoEtapas.numero));
  if (etapas.length === 0) return desdeCodigo();
  const subs = await db
    .select()
    .from(catalogoSubetapas)
    .orderBy(asc(catalogoSubetapas.etapaNumero), asc(catalogoSubetapas.orden));
  const flujo = etapas.map((e) => ({
    numero: e.numero,
    nombre: e.nombre,
    responsable: e.responsable,
    subetapas: subs
      .filter((s) => s.etapaNumero === e.numero)
      .map((s) => ({ orden: s.orden, clave: s.clave, nombre: s.nombre, plazo: s.plazo ?? "" })),
  }));
  if (flujo.every((e) => e.subetapas.length === 0)) return desdeCodigo();
  return flujo;
}

/** Documentos requeridos: misma estrategia (DB primero, código después). */
export const obtenerChecklist = (db: DbExecutor = conexion) => leerChecklist(db);
