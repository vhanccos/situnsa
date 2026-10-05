import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const InstanciaJuradoSchema = z.enum(["TERNA", "JURADO"]);

export const JuradoDTOSchema = z.object({
  id: z.string().uuid(),
  dni: z.string(),
  nombres: z.string(),
  grado: z.string().nullable(),
  /** TERNA = revisión del plan (E1); JURADO = jurado sorteado (E3–E4). */
  instancia: InstanciaJuradoSchema,
  rol: z.string(),
  dictamen: z.string(),
  comentario: z.string().nullable(),
});

export const DesignarJuradoSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  nombres: z.string().min(2).max(160),
  apellidos: z.string().min(2).max(160),
  grado: z.string().max(16).optional(),
  rol: z.enum(["PRESIDENTE", "SECRETARIO", "VOCAL", "SUPLENTE"]).default("VOCAL"),
  /** Por defecto se deduce del estado: E1 → TERNA, E2/E3 → JURADO. */
  instancia: InstanciaJuradoSchema.optional(),
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
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato AAAA-MM-DD"),
  hora: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora en formato HH:MM"),
  lugar: z.string().min(3).max(500),
  modalidad: z.enum(["PRESENCIAL", "VIRTUAL"]).default("PRESENCIAL"),
});

const FechaSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha en formato AAAA-MM-DD");

/** HU-0038 (RN-05.1): el alumno propone un rango, nunca una fecha única. */
export const ProponerFechasSchema = z.object({
  desde: FechaSchema,
  hasta: FechaSchema,
  comentario: z.string().max(500).optional(),
});

export const PropuestaFechasDTOSchema = z.object({
  id: z.string().uuid(),
  desde: z.string(),
  hasta: z.string(),
  comentario: z.string().nullable(),
  /** Nombre de quien registró la propuesta (el tesista o el área en su nombre). */
  propuestaPor: z.string().nullable(),
  createdAt: z.string(),
});

export const ActaSchema = z.object({
  veredicto: z.enum(["FELICITACION", "UNANIMIDAD", "MAYORIA", "DESAPROBACION"]),
});

export const ValidacionDTOSchema = z.object({
  id: z.string().uuid(),
  instancia: z.string(),
  estado: z.string(),
  porcentaje: z.number().nullable(),
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
  /** % Turnitin: obligatorio para OTI_SIMILITUD (el estado se deriva, HU-0042). */
  porcentaje: z.number().int().min(0).max(100).optional(),
  detalle: z.string().max(2000).optional(),
});

export const CierreDTOSchema = z.object({
  expedienteId: z.string().uuid(),
  estado: z.string(),
  jurados: z.array(JuradoDTOSchema),
  sustentacion: SustentacionDTOSchema.nullable(),
  /** Propuesta de fechas vigente del alumno (HU-0038). */
  propuesta: PropuestaFechasDTOSchema.nullable(),
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
  proponerFechas: {
    method: "POST",
    path: "/api/expedientes/:id/sustentacion/propuesta",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ProponerFechasSchema,
    responses: {
      201: PropuestaFechasDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Propuesta de rango de fechas de sustentación (HU-0038: tesista o área)",
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
