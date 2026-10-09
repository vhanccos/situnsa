import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const EstadoSesionSchema = z.enum(["PROGRAMADA", "ABIERTA", "REALIZADA", "CANCELADA"]);
export const EstadoAsistenciaSchema = z.enum(["PENDIENTE", "PRESENTE", "FALTA", "JUSTIFICADA"]);

const FechaCorta = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD");
const HoraCorta = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora HH:MM");

export const TallerSesionDTOSchema = z.object({
  id: z.string().uuid(),
  tallerId: z.string().uuid(),
  nro: z.number(),
  fecha: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  estado: EstadoSesionSchema,
  motivo: z.string().nullable(),
  presentes: z.number(),
  total: z.number(),
});

export const TallerAsistenciaDTOSchema = z.object({
  usuarioDni: z.string(),
  nombres: z.string(),
  estado: EstadoAsistenciaSchema,
  marcadaAt: z.string().nullable(),
  motivo: z.string().nullable(),
});

export type TallerSesionDTO = z.infer<typeof TallerSesionDTOSchema>;
export type TallerAsistenciaDTO = z.infer<typeof TallerAsistenciaDTOSchema>;

export const ReprogramarSesionSchema = z.object({
  fecha: FechaCorta,
  horaInicio: HoraCorta.optional(),
  horaFin: HoraCorta.optional(),
  motivo: z.string().min(5, "Cuenta el motivo de la reprogramación").max(500),
});

export const CancelarSesionSchema = z.object({
  motivo: z.string().min(5, "Cuenta el motivo de la cancelación").max(500),
});

export const CorregirAsistenciaSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  estado: z.enum(["PRESENTE", "FALTA", "JUSTIFICADA"]),
  motivo: z.string().min(5, "El motivo es obligatorio").max(500),
});

const c = initContract();

/** P4 Sesiones y asistencia + P7 marcar (RF-0202 a RF-0205). */
export const sesionesContract = c.router({
  listar: {
    method: "GET",
    path: "/api/talleres/:id/sesiones",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ items: z.array(TallerSesionDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Tabla de sesiones del taller",
  },
  verAsistencia: {
    method: "GET",
    path: "/api/sesiones/:id/asistencia",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({
        sesion: TallerSesionDTOSchema,
        items: z.array(TallerAsistenciaDTOSchema),
      }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Asistencia por alumno de la sesión",
  },
  abrir: {
    method: "POST",
    path: "/api/sesiones/:id/abrir",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: TallerSesionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Abrir asistencia (solo asesor, una a la vez)",
  },
  cerrar: {
    method: "POST",
    path: "/api/sesiones/:id/cerrar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: TallerSesionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Cerrar (pendientes → FALTA, sesión REALIZADA)",
  },
  reprogramar: {
    method: "POST",
    path: "/api/sesiones/:id/reprogramar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ReprogramarSesionSchema,
    responses: {
      200: TallerSesionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Reprogramar (conserva asistencias)",
  },
  cancelar: {
    method: "POST",
    path: "/api/sesiones/:id/cancelar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CancelarSesionSchema,
    responses: {
      200: TallerSesionDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Cancelar (no admite asistencia, no cuenta %)",
  },
  marcar: {
    method: "POST",
    path: "/api/sesiones/:id/marcar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}),
    responses: {
      200: z.object({ estado: EstadoAsistenciaSchema, marcadaAt: z.string() }),
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P7 Marcar asistencia (una vez, ventana abierta)",
  },
  corregir: {
    method: "POST",
    path: "/api/sesiones/:id/corregir",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CorregirAsistenciaSchema,
    responses: {
      200: TallerAsistenciaDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P4 Corregir o justificar (motivo obligatorio)",
  },
});
