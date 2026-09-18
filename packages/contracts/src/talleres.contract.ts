import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const TallerDTOSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  asesorNombre: z.string().nullable(),
  periodo: z.string().nullable(),
  estado: z.enum(["ACTIVO", "CERRADO"]),
  inscritos: z.number(),
});

export const CrearTallerSchema = z.object({
  nombre: z.string().min(3).max(160),
  asesorDni: z.string().length(8).optional(),
  periodo: z.string().max(32).optional(),
});

export const AsesorDTOSchema = z.object({
  id: z.string().uuid(),
  dni: z.string(),
  nombres: z.string(),
  apellidos: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  grado: z.string().nullable(),
  activo: z.boolean(),
  talleres: z.number(),
});

export const CrearAsesorSchema = z.object({
  dni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  nombres: z.string().min(2).max(160),
  apellidos: z.string().min(2).max(160),
  email: z.string().email(),
  telefono: z.string().max(20).optional(),
  grado: z.string().max(16).optional(),
});

const c = initContract();

export const talleresContract = c.router({
  listar: {
    method: "GET",
    path: "/api/talleres",
    responses: {
      200: z.object({ items: z.array(TallerDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "§12 Talleres de Tesis",
  },
  crear: {
    method: "POST",
    path: "/api/talleres",
    body: CrearTallerSchema,
    responses: {
      201: TallerDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Nuevo taller",
  },
});

export const asesoresContract = c.router({
  listar: {
    method: "GET",
    path: "/api/asesores",
    responses: {
      200: z.object({ items: z.array(AsesorDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "§13 Catálogo de asesores",
  },
  crear: {
    method: "POST",
    path: "/api/asesores",
    body: CrearAsesorSchema,
    responses: {
      201: AsesorDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Nuevo asesor",
  },
  cambiarEstado: {
    method: "PATCH",
    path: "/api/asesores/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({ activo: z.boolean() }),
    responses: {
      200: AsesorDTOSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Activar/desactivar sin borrar historial",
  },
});
