import { db } from "@pis/db";
import { construirListadoConsejo, fechaLarga } from "@pis/domain";
import { escribirXlsx } from "../../../../infra/xlsx/escribir-xlsx.js";
import { type AlcanceConsejo, titulandosParaConsejo } from "../../reportes.repository.js";

export interface ArchivoReporte {
  nombreArchivo: string;
  bytes: Uint8Array;
  /** Filas de datos (titulandos). */
  total: number;
}

/** Anchos (caracteres) de las 13 columnas del listado. */
const ANCHOS = [5, 34, 30, 11, 16, 48, 11, 14, 10, 10, 10, 10, 10];

/**
 * Excel consolidado para la sesión del Consejo de Facultad (HU-0046,
 * RN-07.1). Sin reglas que fallen: un listado vacío también se entrega
 * (la sesión puede no tener expedientes).
 */
export class ExportarListadoConsejoUseCase {
  async execute(alcance: AlcanceConsejo, ahora: Date = new Date()): Promise<ArchivoReporte> {
    const listado = construirListadoConsejo(await titulandosParaConsejo(db, alcance));
    const fecha = ahora.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    const bytes = escribirXlsx(
      {
        nombre: "Consejo de Facultad",
        titulo: [
          "UNIVERSIDAD NACIONAL DE SAN AGUSTÍN DE AREQUIPA · FIPS · UNIDAD DE SEGUNDA ESPECIALIDAD",
          `LISTADO CONSOLIDADO PARA EL CONSEJO DE FACULTAD — ${fechaLarga(fecha).toUpperCase()}`,
          alcance === "consejo"
            ? "Expedientes con la subetapa «Consejo de Facultad» en curso"
            : "Expedientes en aprobación institucional (Etapa 6)",
        ],
        encabezados: [...listado.encabezados],
        filas: listado.filas,
        anchos: ANCHOS,
      },
      ahora,
    );
    return { nombreArchivo: `consejo-facultad-${fecha}.xlsx`, bytes, total: listado.filas.length };
  }
}
