/**
 * Catálogo de seguimiento: 7 etapas y 38 subetapas con plazos y responsables.
 * Fuente: legacy-code/SeguimientoSubetapas.js → FLUJO_TITULACION (producción).
 * Puro, sin I/O — lo consumen API (generación de seguimiento) y web (Resumen §9).
 */

export type EstadoSubetapa = "NO_INICIADO" | "EN_CURSO" | "FINALIZADO";

/**
 * Clave estable de subetapa: las reglas de avance (reglas-avance.ts) se
 * asocian a la clave y no a la posición, para que el proceso configurable
 * (HU-0052) pueda renombrar o insertar subetapas sin romper las guardas.
 */
export const CLAVES_SUBETAPA = [
  "E1_PRESENTACION_PLAN",
  "E1_VALIDACION_DOCUMENTOS",
  "E1_ASIGNACION_TERNA",
  "E1_REVISION_TERNA",
  "E1_LEVANTAMIENTO",
  "E1_DECRETO",
  "E2_CARGA_DOCUMENTOS",
  "E2_REVISION_DOCUMENTAL",
  "E2_VALIDACION_EXPEDIENTE",
  "E3_RECEPCION",
  "E3_SORTEO_JURADOS",
  "E3_REVISION_JURADOS",
  "E3_OBSERVACIONES",
  "E3_LEVANTAMIENTO",
  "E3_CONFORMIDAD_FINAL",
  "E4_PROPUESTA_FECHAS",
  "E4_COORDINACION_JURADOS",
  "E4_PUBLICACION",
  "E4_VERSION_FINAL",
  "E4_SUSTENTACION",
  "E5_TURNITIN",
  "E5_REVISION_SIMILITUD",
  "E5_INFORME_SIMILITUD",
  "E5_FIRMA_INFORME",
  "E5_REPOSITORIO",
  "E5_URL_REPOSITORIO",
  "E6_SECRETARIA",
  "E6_COMISION",
  "E6_CONSEJO_FACULTAD",
  "E6_RESOLUCION",
  "E6_SISGRAD",
  "E6_VALIDACION_DATOS",
  "E6_FIRMA_DECANO",
  "E6_GRADOS_TITULOS",
  "E6_CONSEJO_UNIVERSITARIO",
  "E7_COLACION",
  "E7_EMISION_TITULO",
  "E7_SUNEDU",
] as const;

export type ClaveSubetapa = (typeof CLAVES_SUBETAPA)[number];

export function esClaveSubetapa(v: string | null | undefined): v is ClaveSubetapa {
  return typeof v === "string" && (CLAVES_SUBETAPA as readonly string[]).includes(v);
}

export interface SubetapaDef {
  readonly clave: ClaveSubetapa;
  readonly orden: number;
  readonly nombre: string;
  readonly plazo: string;
}

export interface EtapaDef {
  readonly numero: number;
  readonly nombre: string;
  readonly responsable: string;
  readonly subetapas: readonly SubetapaDef[];
}

const R12 = "fips_usesp_aaa@unsa.edu.pe";
const R37 = "fips_usesp@unsa.edu.pe";

function etapa(
  numero: number,
  nombre: string,
  responsable: string,
  subs: Array<[ClaveSubetapa, string, string]>,
): EtapaDef {
  return {
    numero,
    nombre,
    responsable,
    subetapas: subs.map(([clave, nombreS, plazo], i) => ({
      clave,
      orden: i + 1,
      nombre: nombreS,
      plazo,
    })),
  };
}

export const FLUJO_TITULACION: readonly EtapaDef[] = [
  etapa(1, "Verificación Inicial de Documentos", R12, [
    [
      "E1_PRESENTACION_PLAN",
      "Presentación del Plan de Tesis / Trabajo Académico",
      "Según fecha de presentación del alumno",
    ],
    ["E1_VALIDACION_DOCUMENTOS", "Validación de documentos administrativos", "1 a 3 días hábiles"],
    ["E1_ASIGNACION_TERNA", "Asignación de jurados", "1 a 2 días hábiles"],
    ["E1_REVISION_TERNA", "Revisión del plan por la terna", "3 a 5 días hábiles"],
    ["E1_LEVANTAMIENTO", "Levantamiento de observaciones por el alumno", "2 a 5 días hábiles"],
    ["E1_DECRETO", "Emisión del decreto de aprobación", "2 a 4 días hábiles"],
  ]),
  etapa(2, "Presentación del Borrador de Tesis", R12, [
    ["E2_CARGA_DOCUMENTOS", "Carga de documentos", "Variable"],
    ["E2_REVISION_DOCUMENTAL", "Revisión documental", "2 a 5 días hábiles"],
    ["E2_VALIDACION_EXPEDIENTE", "Validación del expediente", "1 a 3 días hábiles"],
  ]),
  etapa(3, "Evaluación del Expediente", R37, [
    ["E3_RECEPCION", "Recepción y validación del expediente", "1 a 2 días hábiles"],
    ["E3_SORTEO_JURADOS", "Programación de sorteo de jurados", "2 a 7 días hábiles"],
    ["E3_REVISION_JURADOS", "Revisión del borrador por jurados", "20 días hábiles"],
    ["E3_OBSERVACIONES", "Emisión de observaciones", "Incluido en revisión"],
    ["E3_LEVANTAMIENTO", "Levantamiento de observaciones por el alumno", "2 a 10 días hábiles"],
    ["E3_CONFORMIDAD_FINAL", "Conformidad final de jurados", "1 a 3 días hábiles"],
  ]),
  etapa(4, "Programación y Sustentación", R37, [
    ["E4_PROPUESTA_FECHAS", "Propuesta de fechas por el alumno", "1 a 3 días hábiles"],
    ["E4_COORDINACION_JURADOS", "Coordinación con jurados", "2 a 5 días hábiles"],
    ["E4_PUBLICACION", "Publicación oficial de sustentación", "1 día hábil"],
    ["E4_VERSION_FINAL", "Presentación de versión final", "1 a 2 días hábiles antes de sustentar"],
    ["E4_SUSTENTACION", "Sustentación presencial", "Fecha programada"],
  ]),
  etapa(5, "Validaciones Institucionales", R37, [
    ["E5_TURNITIN", "Evaluación en Turnitin", "5 a 20 días hábiles"],
    ["E5_REVISION_SIMILITUD", "Revisión de similitud", "1 a 3 días hábiles"],
    ["E5_INFORME_SIMILITUD", "Emisión del informe de similitud", "1 a 2 días hábiles"],
    ["E5_FIRMA_INFORME", "Firma del informe", "2 a 5 días hábiles"],
    ["E5_REPOSITORIO", "Registro en repositorio institucional", "5 a 15 días hábiles"],
    ["E5_URL_REPOSITORIO", "Generación de URL del repositorio", "1 día hábil"],
  ]),
  etapa(6, "Aprobaciones Institucionales", R37, [
    ["E6_SECRETARIA", "Revisión por Secretaría Académica", "2 a 6 días hábiles"],
    ["E6_COMISION", "Comisión de Grados y Títulos", "2 a 5 días hábiles"],
    ["E6_CONSEJO_FACULTAD", "Consejo de Facultad", "Según sesión programada"],
    ["E6_RESOLUCION", "Emisión de resolución", "4 a 6 días hábiles"],
    ["E6_SISGRAD", "Registro en SISGRAD", "1 a 3 días hábiles"],
    ["E6_VALIDACION_DATOS", "Validación de datos del alumno", "1 a 2 días hábiles"],
    ["E6_FIRMA_DECANO", "Firma de autorización del Decano", "1 a 2 días hábiles"],
    ["E6_GRADOS_TITULOS", "Revisión por Oficina de Grados y Títulos", "5 a 15 días hábiles"],
    ["E6_CONSEJO_UNIVERSITARIO", "Aprobación por Consejo Universitario", "5 a 15 días hábiles"],
  ]),
  etapa(7, "Registro y Emisión del Título", R37, [
    ["E7_COLACION", "Programación de colación", "Según cronograma institucional"],
    ["E7_EMISION_TITULO", "Emisión del título profesional", "3 a 7 días hábiles"],
    [
      "E7_SUNEDU",
      "Registro del título en SUNEDU",
      "Aproximadamente 15 días posteriores a la colación",
    ],
  ]),
];

export const TOTAL_SUBETAPAS: number = FLUJO_TITULACION.reduce((n, e) => n + e.subetapas.length, 0);

/**
 * Clave de la subetapa en la posición estándar (etapa, orden) del flujo en
 * código. La usan las migraciones/seeds para expedientes creados antes de
 * que existieran las claves.
 */
export function claveEnPosicion(etapaNumero: number, orden: number): ClaveSubetapa | null {
  const e = FLUJO_TITULACION.find((x) => x.numero === etapaNumero);
  return e?.subetapas.find((s) => s.orden === orden)?.clave ?? null;
}

/** Etapa actual (1–7) derivada del estado macro del expediente. */
export function etapaActualDe(estado: string): number {
  switch (estado) {
    case "REGISTRADO":
    case "EN_PLAN":
    case "OBSERVADO":
      return 1;
    case "PLAN_APROBADO":
    case "EN_BORRADOR":
      return 2;
    case "EN_DICTAMEN":
      return 3;
    case "APTO_SUSTENTACION":
      return 4;
    case "SUSTENTADO":
    case "EN_VALIDACION":
      return 5;
    case "EN_APROBACION":
      return 6;
    case "TITULO_EMITIDO":
      return 7;
    default:
      return 1;
  }
}

/** 13 programas oficiales FIPS (legacy 96_BD_ProgramasOficialesV189). */
export const PROGRAMAS_OFICIALES: readonly { codigo: string; nombre: string }[] = [
  {
    codigo: "SEGIND",
    nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SEGURIDAD INDUSTRIAL E HIGIENE OCUPACIONAL",
  },
  { codigo: "PROY", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE PROYECTOS" },
  { codigo: "PROD", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE PRODUCCIÓN" },
  {
    codigo: "LOG",
    nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA LOGÍSTICA Y COMERCIO INTERNACIONAL",
  },
  { codigo: "MANT", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE MANTENIMIENTO" },
  { codigo: "ER", nombre: "SEGUNDA ESPECIALIDAD EN ENERGÍAS RENOVABLES" },
  { codigo: "SIS", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE SISTEMAS" },
  { codigo: "TEL", nombre: "SEGUNDA ESPECIALIDAD DE INGENIERÍA EN TELECOMUNICACIONES" },
  { codigo: "FIN", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA FINANCIERA" },
  {
    codigo: "COM",
    nombre: "SEGUNDA ESPECIALIDAD DE INGENIERÍA COMERCIAL Y NEGOCIOS INTERNACIONALES",
  },
  { codigo: "RRHH", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE RECURSOS HUMANOS" },
  { codigo: "BIO", nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA BIOMÉDICA" },
  {
    codigo: "REF",
    nombre: "SEGUNDA ESPECIALIDAD EN INGENIERÍA DE REFRIGERACIÓN Y AIRE ACONDICIONADO",
  },
];

/** RN-L04/L14: el programa debe ser uno de los 13 oficiales (nombre exacto). */
export function esProgramaOficial(nombre: string): boolean {
  return PROGRAMAS_OFICIALES.some((p) => p.nombre === nombre);
}
