/**
 * Datos del expediente → etiquetas de documento (alias del legacy V26:
 * <<DECRETO>>, <<OFICIO>>, <<COASESOR>>, <<MOD_F>>…). Aplica RN-L07
 * (administrativos en MAYÚSCULAS, TESIS tal cual la escribió el autor) y
 * RN-L08 (asesor en formato profesional con su grado). Puro.
 */

import {
  type ModalidadCanon,
  modalidadAEtiqueta,
  normalizarAdministrativo,
} from "../expediente/modalidades.js";
import { fechaLarga } from "./etiquetas.js";

export interface PersonaDocumento {
  readonly nombres: string;
  readonly apellidos: string;
  readonly dni: string;
  readonly cui?: string | null;
  readonly grado?: string | null;
}

export interface ExpedienteDocumento {
  readonly codigo: string;
  readonly titulo: string;
  readonly programa: string;
  readonly modalidad: ModalidadCanon;
  readonly participante1: PersonaDocumento | null;
  readonly participante2: PersonaDocumento | null;
  readonly asesor: PersonaDocumento | null;
  readonly datosAdmin: Readonly<Record<string, string | null>>;
  readonly sustentacion?: {
    readonly fecha: string;
    readonly hora: string;
    readonly lugar: string;
    readonly actaVeredicto: string | null;
  } | null;
  /** Jurado sorteado (E3) registrado en Cierre; si falta se usan los datos legacy. */
  readonly jurado?: ReadonlyArray<{ readonly rol: string; readonly nombre: string }>;
  /** Validaciones institucionales que citan los informes (E5). */
  readonly validaciones?: {
    readonly similitud: number | null;
    readonly urlRepositorio: string | null;
  } | null;
}

const MODALIDAD_FINAL: Readonly<Record<ModalidadCanon, string>> = {
  TESIS: "La Tesis",
  TRABAJO_ACADEMICO: "El Trabajo Académico",
  ARTICULO: "La Tesis Formato Artículo",
};

const VEREDICTO: Readonly<Record<string, string>> = {
  FELICITACION: "APROBADO CON FELICITACIÓN PÚBLICA",
  UNANIMIDAD: "APROBADO POR UNANIMIDAD",
  MAYORIA: "APROBADO POR MAYORÍA",
  DESAPROBACION: "DESAPROBADO",
};

function nombreCompleto(p: PersonaDocumento | null): string {
  return p ? `${p.nombres} ${p.apellidos}`.replace(/\s+/g, " ").trim() : "";
}

/** RN-L08: "DR. NOMBRES APELLIDOS" usando el grado registrado del asesor. */
export function formatoAsesor(p: PersonaDocumento | null): string {
  if (!p) return "";
  const grado = (p.grado ?? "").trim();
  const nombre = nombreCompleto(p);
  return normalizarAdministrativo("asesorNombre", grado ? `${grado} ${nombre}` : nombre);
}

function texto(v: string | null | undefined): string {
  return (v ?? "").trim();
}

/** "A", "A y B", "A, B y C". */
function unirLista(partes: readonly string[]): string {
  if (partes.length <= 1) return partes[0] ?? "";
  return `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

const ORDEN_ROL = ["PRESIDENTE", "SECRETARIO", "VOCAL", "SUPLENTE"];

/** Jurado en texto corrido: "DR. ANA RUIZ (presidente), …" (RN-L07: nombres en mayúsculas). */
function textoJurado(exp: ExpedienteDocumento): string {
  const registrado = [...(exp.jurado ?? [])].sort(
    (x, y) => ORDEN_ROL.indexOf(x.rol) - ORDEN_ROL.indexOf(y.rol),
  );
  if (registrado.length > 0) {
    return unirLista(
      registrado.map(
        (j) => `${normalizarAdministrativo("asesorNombre", j.nombre)} (${j.rol.toLowerCase()})`,
      ),
    );
  }
  const a = exp.datosAdmin;
  const legacy: Array<[string, string]> = [
    ["presidente", texto(a.presidenteE2)],
    ["secretario", texto(a.secretarioE2)],
    ["suplente", texto(a.suplenteE2)],
  ];
  return unirLista(legacy.filter(([, n]) => n).map(([rol, n]) => `${n} (${rol})`));
}

/** Mapa etiqueta → valor (claves en mayúsculas, como las normaliza segmentar). */
export function construirDatosDocumento(
  exp: ExpedienteDocumento,
  hoy: Date,
): Record<string, string> {
  const a = exp.datosAdmin;
  const p1 = exp.participante1;
  const p2 = exp.participante2;
  const nombres = [nombreCompleto(p1), nombreCompleto(p2)].filter(Boolean).join(" y ");
  const dnis = [p1?.dni, p2?.dni].filter((d): d is string => !!d).join(" / ");
  const asesor = texto(a.asesorNombre) || formatoAsesor(exp.asesor);
  const modFinal =
    texto(a.modalidadVirtual) || texto(a.modalidadFinal) || MODALIDAD_FINAL[exp.modalidad];
  // Fecha civil de Arequipa (UTC-5), no la del servidor.
  const fechaIso = hoy.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const sust = exp.sustentacion ?? null;
  const datos: Record<string, string> = {
    CODIGO: exp.codigo,
    TESIS: exp.titulo.trim(),
    "TESIS 02": texto(a.titulo02),
    NOMBRES: nombres,
    NOMBRES_1: nombreCompleto(p1),
    NOMBRES_2: nombreCompleto(p2),
    DNI: dnis,
    DNI_1: p1?.dni ?? "",
    DNI_2: p2?.dni ?? "",
    CUI: texto(p1?.cui),
    PROGRAMA: normalizarAdministrativo("programa", exp.programa),
    MODALIDAD: modalidadAEtiqueta(exp.modalidad),
    MOD_F: modFinal,
    "MODALIDAD FINAL": modFinal,
    ASESOR: asesor,
    COASESOR: texto(a.coAsesor),
    "CO ASESOR": texto(a.coAsesor),
    DECRETO: texto(a.nroDecreto),
    "N° DECRETO": texto(a.nroDecreto),
    OFICIO: texto(a.nroOficio),
    RECOMENDACION: texto(a.recomendacion),
    PRESIDENTE: texto(a.presidente),
    SECRETARIO: texto(a.secretario),
    INTEGRANTE: texto(a.integrante),
    "PRESIDENTE ETAPA 02": texto(a.presidenteE2),
    "SECRETARIO ETAPA 02": texto(a.secretarioE2),
    "SUPLENTE ETAPA 02": texto(a.suplenteE2),
    DECANAL: texto(a.decanal),
    "FECHA APERTURA": fechaLarga(a.fechaApertura),
    "FECHA PRESENTACION": fechaLarga(a.fechaPresentacion),
    FECHA: fechaLarga(sust?.fecha ?? a.fechaSustentacion),
    HORA: texto(sust?.hora ?? a.horaSustentacion),
    "LUGAR SUSTENTACION": normalizarAdministrativo(
      "lugarSustentacion",
      texto(sust?.lugar ?? a.lugarSustentacion),
    ),
    VEREDICTO: sust?.actaVeredicto ? (VEREDICTO[sust.actaVeredicto] ?? sust.actaVeredicto) : "",
    JURADO: textoJurado(exp),
    SIMILITUD:
      exp.validaciones?.similitud !== null && exp.validaciones?.similitud !== undefined
        ? String(exp.validaciones.similitud)
        : "",
    "URL REPOSITORIO": texto(exp.validaciones?.urlRepositorio),
    FECHA_EMISION: fechaLarga(fechaIso),
    ANIO: fechaIso.slice(0, 4),
  };
  return datos;
}
