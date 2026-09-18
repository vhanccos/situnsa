import { pgEnum } from "drizzle-orm/pg-core";

/** Estados macro del expediente — docs/02-domain/state-machine.md §2 */
export const estadoExpedienteEnum = pgEnum("estado_expediente", [
  "REGISTRADO",
  "EN_PLAN",
  "PLAN_APROBADO",
  "EN_BORRADOR",
  "EN_DICTAMEN",
  "APTO_SUSTENTACION",
  "SUSTENTADO",
  "EN_VALIDACION",
  "EN_APROBACION",
  "TITULO_EMITIDO",
  "OBSERVADO",
  "DESAPROBADO_TRUNCO",
  "ANULADO",
]);

export type EstadoExpediente =
  | "REGISTRADO"
  | "EN_PLAN"
  | "PLAN_APROBADO"
  | "EN_BORRADOR"
  | "EN_DICTAMEN"
  | "APTO_SUSTENTACION"
  | "SUSTENTADO"
  | "EN_VALIDACION"
  | "EN_APROBACION"
  | "TITULO_EMITIDO"
  | "OBSERVADO"
  | "DESAPROBADO_TRUNCO"
  | "ANULADO";

export const rolUsuarioEnum = pgEnum("rol_usuario", [
  "TESISTA",
  "ASESOR",
  "JURADO",
  "ADMIN_FIPS",
  "SECRETARIA",
  "DECANO",
  "INVITADO",
]);

export type RolUsuario =
  | "TESISTA"
  | "ASESOR"
  | "JURADO"
  | "ADMIN_FIPS"
  | "SECRETARIA"
  | "DECANO"
  | "INVITADO";

export const modalidadEnum = pgEnum("modalidad", ["TESIS", "TRABAJO_ACADEMICO", "ARTICULO"]);

export type Modalidad = "TESIS" | "TRABAJO_ACADEMICO" | "ARTICULO";

export const estadoDocumentoEnum = pgEnum("estado_documento", [
  "PENDIENTE",
  "CARGADO",
  "OBSERVADO",
  "APROBADO",
  "RECHAZADO",
]);

/** Seguimiento de subetapas (legacy FLUJO_TITULACION, INTERFACES §9). */
export const estadoSubetapaEnum = pgEnum("estado_subetapa", [
  "NO_INICIADO",
  "EN_CURSO",
  "FINALIZADO",
]);

export type EstadoSubetapa = "NO_INICIADO" | "EN_CURSO" | "FINALIZADO";

export const estadoTallerEnum = pgEnum("estado_taller", ["ACTIVO", "CERRADO"]);

export type EstadoTaller = "ACTIVO" | "CERRADO";
