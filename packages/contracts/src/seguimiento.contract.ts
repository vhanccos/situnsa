import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";
import {
  AuditoriaItemDTOSchema,
  AvanceDTOSchema,
  MensajeDTOSchema,
  SubetapaDTOSchema,
} from "./expedientes.contract.js";

export const ObservarInscripcionSchema = z.object({
  motivo: z.string().min(5).max(2000),
});

/** Derivación de subetapa a otro responsable del área (HU-0054). */
export const DerivarSubetapaSchema = z.object({
  responsable: z.string().email("Correo del nuevo responsable inválido"),
  motivo: z.string().max(500).optional(),
});

export const SubetapaFinalizadaDTOSchema = z.object({
  id: z.string().uuid(),
  etapa: z.number(),
  orden: z.number(),
  estado: z.string(),
  siguienteId: z.string().uuid().nullable(),
  /** Estado macro del expediente tras aplicar las reglas de avance. */
  estadoExpediente: z.string(),
});

export const SeguimientoDTOSchema = z.object({
  expedienteId: z.string().uuid(),
  avance: AvanceDTOSchema,
  subetapas: z.array(SubetapaDTOSchema),
});

export const HistorialDTOSchema = z.object({
  expedienteId: z.string().uuid(),
  mensajes: z.array(MensajeDTOSchema),
  historial: z.array(AuditoriaItemDTOSchema),
});

const c = initContract();

/**
 * Operación del proceso (port S-FIPS API.md, Oleada B):
 * observar inscripción, V°B° documental, finalización de subetapas y
 * lecturas de seguimiento/historial separadas del detalle.
 */
export const seguimientoContract = c.router({
  observar: {
    method: "POST",
    path: "/api/expedientes/:id/observar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ObservarInscripcionSchema,
    responses: {
      200: z.object({ id: z.string().uuid(), estado: z.string() }),
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Observar el expediente (→ OBSERVADO) con motivo visible al tesista",
  },
  derivarSubetapa: {
    method: "POST",
    path: "/api/subetapas/:id/derivar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: DerivarSubetapaSchema,
    responses: {
      200: z.object({ id: z.string().uuid(), responsable: z.string() }),
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Deriva la subetapa a otro responsable (historial + correo)",
  },
  finalizarSubetapa: {
    method: "POST",
    path: "/api/subetapas/:id/finalizar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: SubetapaFinalizadaDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Finaliza subetapa EN_CURSO y habilita la siguiente (RN-09)",
  },
  seguimiento: {
    method: "GET",
    path: "/api/expedientes/:id/seguimiento",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: SeguimientoDTOSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Subetapas + avance (lectura separada del detalle)",
  },
  historial: {
    method: "GET",
    path: "/api/expedientes/:id/historial",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: HistorialDTOSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Mensajes + cadena de custodia (lectura separada)",
  },
});
