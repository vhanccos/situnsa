import { CHECKLIST_COMPLETO, FLUJO_TITULACION } from "@pis/domain";
import { and, eq } from "drizzle-orm";
import type { Db } from "../client.js";
import {
  catalogoDocsRequeridos,
  catalogoEtapas,
  catalogoSubetapas,
} from "../schema/catalogo-proceso.js";

/**
 * Siembra del catálogo del proceso (idempotente, seguro en prod):
 * etapas + 38 subetapas + documentos requeridos desde el código actual.
 */
export async function seedCatalogoProceso(db: Db): Promise<void> {
  for (const etapa of FLUJO_TITULACION) {
    await db
      .insert(catalogoEtapas)
      .values({ numero: etapa.numero, nombre: etapa.nombre, responsable: etapa.responsable })
      .onConflictDoNothing({ target: catalogoEtapas.numero });
    for (const s of etapa.subetapas) {
      const existe = await db
        .select({ id: catalogoSubetapas.id })
        .from(catalogoSubetapas)
        .where(
          and(
            eq(catalogoSubetapas.etapaNumero, etapa.numero),
            eq(catalogoSubetapas.orden, s.orden),
          ),
        )
        .limit(1);
      if (existe.length === 0) {
        await db.insert(catalogoSubetapas).values({
          etapaNumero: etapa.numero,
          orden: s.orden,
          nombre: s.nombre,
          plazo: s.plazo,
          obligatoria: true,
        });
      }
    }
  }
  for (const d of CHECKLIST_COMPLETO) {
    await db
      .insert(catalogoDocsRequeridos)
      .values({ etapa: d.etapa, tipo: d.tipo, nombre: d.nombre, obligatorio: d.obligatorio })
      .onConflictDoNothing({ target: catalogoDocsRequeridos.tipo });
  }
  console.log("Catálogo del proceso (7 etapas, 38 subetapas, checklist)");
}
