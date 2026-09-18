/**
 * Catálogo de seguimiento: 7 etapas y 38 subetapas con plazos y responsables.
 * Fuente: legacy-code/SeguimientoSubetapas.js → FLUJO_TITULACION (producción).
 * Puro, sin I/O — lo consumen API (generación de seguimiento) y web (Resumen §9).
 */

export type EstadoSubetapa = "NO_INICIADO" | "EN_CURSO" | "FINALIZADO";

export interface SubetapaDef {
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
  subs: Array<[string, string]>,
): EtapaDef {
  return {
    numero,
    nombre,
    responsable,
    subetapas: subs.map(([nombreS, plazo], i) => ({ orden: i + 1, nombre: nombreS, plazo })),
  };
}

export const FLUJO_TITULACION: readonly EtapaDef[] = [
  etapa(1, "Verificación Inicial de Documentos", R12, [
    [
      "Presentación del Plan de Tesis / Trabajo Académico",
      "Según fecha de presentación del alumno",
    ],
    ["Validación de documentos administrativos", "1 a 3 días hábiles"],
    ["Asignación de jurados", "1 a 2 días hábiles"],
    ["Revisión del plan por la terna", "3 a 5 días hábiles"],
    ["Levantamiento de observaciones por el alumno", "2 a 5 días hábiles"],
    ["Emisión del decreto de aprobación", "2 a 4 días hábiles"],
  ]),
  etapa(2, "Presentación del Borrador de Tesis", R12, [
    ["Carga de documentos", "Variable"],
    ["Revisión documental", "2 a 5 días hábiles"],
    ["Validación del expediente", "1 a 3 días hábiles"],
  ]),
  etapa(3, "Evaluación del Expediente", R37, [
    ["Recepción y validación del expediente", "1 a 2 días hábiles"],
    ["Programación de sorteo de jurados", "2 a 7 días hábiles"],
    ["Revisión del borrador por jurados", "20 días hábiles"],
    ["Emisión de observaciones", "Incluido en revisión"],
    ["Levantamiento de observaciones por el alumno", "2 a 10 días hábiles"],
    ["Conformidad final de jurados", "1 a 3 días hábiles"],
  ]),
  etapa(4, "Programación y Sustentación", R37, [
    ["Propuesta de fechas por el alumno", "1 a 3 días hábiles"],
    ["Coordinación con jurados", "2 a 5 días hábiles"],
    ["Publicación oficial de sustentación", "1 día hábil"],
    ["Presentación de versión final", "1 a 2 días hábiles antes de sustentar"],
    ["Sustentación presencial", "Fecha programada"],
  ]),
  etapa(5, "Validaciones Institucionales", R37, [
    ["Evaluación en Turnitin", "5 a 20 días hábiles"],
    ["Revisión de similitud", "1 a 3 días hábiles"],
    ["Emisión del informe de similitud", "1 a 2 días hábiles"],
    ["Firma del informe", "2 a 5 días hábiles"],
    ["Registro en repositorio institucional", "5 a 15 días hábiles"],
    ["Generación de URL del repositorio", "1 día hábil"],
  ]),
  etapa(6, "Aprobaciones Institucionales", R37, [
    ["Revisión por Secretaría Académica", "2 a 6 días hábiles"],
    ["Comisión de Grados y Títulos", "2 a 5 días hábiles"],
    ["Consejo de Facultad", "Según sesión programada"],
    ["Emisión de resolución", "4 a 6 días hábiles"],
    ["Registro en SISGRAD", "1 a 3 días hábiles"],
    ["Validación de datos del alumno", "1 a 2 días hábiles"],
    ["Firma de autorización del Decano", "1 a 2 días hábiles"],
    ["Revisión por Oficina de Grados y Títulos", "5 a 15 días hábiles"],
    ["Aprobación por Consejo Universitario", "5 a 15 días hábiles"],
  ]),
  etapa(7, "Registro y Emisión del Título", R37, [
    ["Programación de colación", "Según cronograma institucional"],
    ["Emisión del título profesional", "3 a 7 días hábiles"],
    ["Registro del título en SUNEDU", "Aproximadamente 15 días posteriores a la colación"],
  ]),
];

export const TOTAL_SUBETAPAS: number = FLUJO_TITULACION.reduce((n, e) => n + e.subetapas.length, 0);

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
