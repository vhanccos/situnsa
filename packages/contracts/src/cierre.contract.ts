import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const JuradoDTOSchema = z.object({
  id: z.string().uuid(),
  dni: z.string(),
  nombres: z.string(),
  grado: z.string().nullable(),
  rol: z.string(),
  dictamen: z.string(),
});

export const DesignarJuradoSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  nombres: z.string().min(2).max(160),
  apellidos: z.string().min(2).max(160),
  grado: z.string().max(16).optional(),
  rol: z.enum(["PRESIDENTE", "SECRETARIO", "VOCAL", "SUPLENTE"]).default("VOCAL"),
});

export const DictamenSchema = z.object({
  dictamen: z.enum(["FAVORABLE", "OBSERVADO"]),
  comentario: z.string().max(2000).optional(),
});

export const SustentacionDTOSchema = z.object({
  id: z.string().uuid(),
  fecha: z.string(),
  hora: z.string(),
  lugar: z.string(),
  modalidad: z.string(),
  actaVeredicto: z.string().nullable(),
});

export const ProgramarSustentacionSchema = z.object({
  fecha: z.string().min(4).max(32),
  hora: z.string().min(2).max(16),
  lugar: z.string().min(3).max(500),
  modalidad: z.enum(["PRESENCIAL", "VIRTUAL"]).default("PRESENCIAL"),
});

export const ActaSchema = z.object({
  veredicto: z.enum(["FELICITACION", "UNANIMIDAD", "MAYORIA", "DESAPROBACION"]),
});

export const ValidacionDTOSchema = z.object({
  id: z.string().uuid(),
  instancia: z.string(),
  estado: z.string(),
  detalle: z.string().nullable(),
});

export const RegistrarValidacionSchema = z.object({
  instancia: z.enum([
    "OTI_SIMILITUD",
    "REPOSITORIO",
    "SECRETARIA",
    "COMISION",
    "CONSEJO_FACULTAD",
    "RESOLUCION",
    "SISGRAD",
    "DECANO",
    "GRADOS_TITULOS",
    "CONSEJO_UNIVERSITARIO",
    "COLACION",
    "SUNEDU",
  ]),
  estado: z.enum(["PENDIENTE", "APROBADO", "OBSERVADO"]).default("APROBADO"),
  detalle: z.string().max(2000).optional(),
});

export const CierreDTOSchema = z.object({
  expedienteId: z.string().uuid(),
  estado: z.string(),
  jurados: z.array(JuradoDTOSchema),
  sustentacion: SustentacionDTOSchema.nullable(),
  validaciones: z.array(ValidacionDTOSchema),
});

const c = initContract();

/** Cierre del trámite (Oleada D, RF-04…RF-07). */
export const cierreContract = c.router({
  verCierre: {
    method: "GET",
    path: "/api/expedientes/:id/cierre",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: CierreDTOSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Jurados + sustentación + validaciones del expediente",
  },
  designarJurado: {
    method: "POST",
    path: "/api/expedientes/:id/jurados",
    pathParams: z.object({ id: z.string().uuid() }),
    body: DesignarJuradoSchema,
    responses: {
      201: JuradoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Designar jurado (sorteo E3 / terna E1)",
  },
  dictaminar: {
    method: "POST",
    path: "/api/expedientes/:id/jurados/:juradoId/dictamen",
    pathParams: z.object({ id: z.string().uuid(), juradoId: z.string().uuid() }),
    body: DictamenSchema,
    responses: {
      200: JuradoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Dictamen (registro delegado: lo asienta el responsable, RN-08)",
  },
  programarSustentacion: {
    method: "POST",
    path: "/api/expedientes/:id/sustentacion",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ProgramarSustentacionSchema,
    responses: {
      200: SustentacionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Programar sustentación (RF-05, sin acta aún)",
  },
  registrarActa: {
    method: "POST",
    path: "/api/expedientes/:id/sustentacion/acta",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ActaSchema,
    responses: {
      200: SustentacionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Acta: aprobatorio → SUSTENTADO, desaprobación → trunco (FSM)",
  },
  registrarValidacion: {
    method: "POST",
    path: "/api/expedientes/:id/validaciones",
    pathParams: z.object({ id: z.string().uuid() }),
    body: RegistrarValidacionSchema,
    responses: {
      200: ValidacionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Avance institucional por instancia (upsert, RF-06/07)",
  },
});
