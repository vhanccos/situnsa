import { z } from "zod";

export const EstadoExpedienteSchema = z.enum([
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
export type EstadoExpediente = z.infer<typeof EstadoExpedienteSchema>;

export const RolUsuarioSchema = z.enum([
  "TESISTA",
  "ASESOR",
  "JURADO",
  "ADMIN_FIPS",
  "SECRETARIA",
  "DECANO",
  "INVITADO",
]);

export const ModalidadSchema = z.enum(["TESIS", "TRABAJO_ACADEMICO", "ARTICULO"]);
export type Modalidad = z.infer<typeof ModalidadSchema>;
