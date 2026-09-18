import { catalogoDocsRequeridos, catalogoEtapas, catalogoSubetapas, db } from "@pis/db";
import { CHECKLIST_COMPLETO, type EtapaDef, FLUJO_TITULACION } from "@pis/domain";
import { asc } from "drizzle-orm";

/**
 * Catálogo del proceso desde DB con fallback al código (Oleada B3).
 * Mientras la UI admin editable (P2) no exista, ambas fuentes coinciden;
 * si la tabla está vacía o falla la lectura, se usa FLUJO_TITULACION.
 */
export async function obtenerFlujo(): Promise<readonly EtapaDef[]> {
  try {
    const etapas = await db.select().from(catalogoEtapas).orderBy(asc(catalogoEtapas.numero));
    if (etapas.length === 0) return FLUJO_TITULACION;
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
        .map((s) => ({ orden: s.orden, nombre: s.nombre, plazo: s.plazo ?? "" })),
    }));
    if (flujo.every((e) => e.subetapas.length === 0)) return FLUJO_TITULACION;
    return flujo;
  } catch {
    return FLUJO_TITULACION;
  }
}

/** Documentos requeridos: misma estrategia (DB primero, código después). */
export async function obtenerChecklist(): Promise<typeof CHECKLIST_COMPLETO> {
  try {
    const rows = await db.select().from(catalogoDocsRequeridos);
    if (rows.length === 0) return CHECKLIST_COMPLETO;
    return rows.map((r) => ({
      tipo: r.tipo,
      nombre: r.nombre,
      etapa: r.etapa as "E1" | "E2",
      obligatorio: r.obligatorio,
    })) as typeof CHECKLIST_COMPLETO;
  } catch {
    return CHECKLIST_COMPLETO;
  }
}
