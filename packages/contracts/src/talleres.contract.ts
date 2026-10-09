import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const EstadoTallerSchema = z.enum(["ACTIVO", "CERRADO", "CANCELADO"]);

const FechaCorta = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD");
const HoraCorta = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora HH:MM");

/** P1: tarjeta + columnas (Taller, Asesor, Período, Días y hora, Cupo, Sesiones, Estado). */
export const TallerDTOSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  asesorNombre: z.string().nullable(),
  asesorDni: z.string().nullable(),
  periodo: z.string().nullable(),
  estado: EstadoTallerSchema,
  inscritos: z.number(),
  cupoMax: z.number().nullable(),
  fechaInicio: z.string().nullable(),
  diasSesion: z.array(z.number()),
  horaInicio: z.string().nullable(),
  horaFin: z.string().nullable(),
  enlace: z.string().nullable(),
  sesiones: z.object({ realizadas: z.number(), total: z.number() }),
});

export type TallerDTO = z.infer<typeof TallerDTOSchema>;

export const TallerDetalleDTOSchema = TallerDTOSchema.extend({
  grupos: z.array(
    z.object({
      id: z.string().uuid(),
      nombre: z.string(),
      asesorNombre: z.string().nullable(),
      miembros: z.number(),
    }),
  ),
});

export type TallerDetalleDTO = z.infer<typeof TallerDetalleDTOSchema>;

/** P3/P5 fila de alumno: DNI, grupo, % asistencia, estado de pagos, expediente. */
export const AlumnoTallerDTOSchema = z.object({
  usuarioDni: z.string(),
  nombres: z.string(),
  grupoId: z.string().uuid(),
  grupoNombre: z.string(),
  asistenciaPct: z.number(),
  pagosEstado: z.enum(["AL_DIA", "CON_DEUDA", "SIN_CUOTAS"]),
  pagosVencidas: z.number(),
  expediente: z.string().nullable(),
});

export type AlumnoTallerDTO = z.infer<typeof AlumnoTallerDTOSchema>;

/** P2: campos obligatorios (*) + vista previa (la genera el servidor). */
export const CrearTallerSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 letras").max(160),
  periodo: z.string().max(32).optional(),
  asesorDni: z.string().length(8).optional(),
  fechaInicio: FechaCorta,
  diasSesion: z.array(z.number().int().min(1).max(7)).min(1, "Marca al menos un día"),
  horaInicio: HoraCorta,
  horaFin: HoraCorta,
  totalSesiones: z.number().int().min(1).max(52).default(12),
  cupoMax: z.number().int().min(1),
  enlace: z
    .string()
    .refine((v) => v === "" || v.startsWith("https://"), {
      message: "El enlace debe empezar con https://",
    })
    .optional(),
});

export const VistaPreviaTallerSchema = z.object({
  sesiones: z.number(),
  primera: z.string(),
  ultima: z.string(),
});

/** P3 Editar: nombre, cupo y enlace (el asesor se cambia con motivo). */
export const EditarTallerSchema = z.object({
  nombre: z.string().min(3).max(160).optional(),
  periodo: z.string().max(32).nullable().optional(),
  cupoMax: z.number().int().min(1).optional(),
  enlace: z
    .string()
    .refine((v) => v === "" || v.startsWith("https://"), {
      message: "El enlace debe empezar con https://",
    })
    .nullable()
    .optional(),
});

export const CambiarAsesorSchema = z.object({
  asesorDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  motivo: z.string().min(5, "Cuenta el motivo del cambio").max(500),
});

export const CancelarTallerSchema = z.object({
  motivo: z.string().min(5, "Cuenta el motivo de la cancelación").max(500),
});

export const FiltrosTallerSchema = z.object({
  periodo: z.string().optional(),
  estado: EstadoTallerSchema.optional(),
  asesorDni: z.string().optional(),
});

const c = initContract();

export const talleresContract = c.router({
  listar: {
    method: "GET",
    path: "/api/talleres",
    query: FiltrosTallerSchema,
    responses: {
      200: z.object({ items: z.array(TallerDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "P1 Lista de talleres (filtros combinables)",
  },
  crear: {
    method: "POST",
    path: "/api/talleres",
    body: CrearTallerSchema,
    responses: {
      201: TallerDetalleDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      409: ErrorEnvelopeSchema,
    },
    summary: "P2 Nuevo taller (genera sesiones y abre P3)",
  },
  vistaPrevia: {
    method: "POST",
    path: "/api/talleres/vista-previa",
    body: CrearTallerSchema,
    responses: {
      200: VistaPreviaTallerSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "P2 vista previa sin guardar",
  },
  detalle: {
    method: "GET",
    path: "/api/talleres/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: TallerDetalleDTOSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P3 Detalle del taller",
  },
  alumnos: {
    method: "GET",
    path: "/api/talleres/:id/alumnos",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ items: z.array(AlumnoTallerDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P3/P5 Alumnos del taller (DNI, grupo, asistencia, pagos, expediente)",
  },
  editar: {
    method: "PATCH",
    path: "/api/talleres/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: EditarTallerSchema,
    responses: {
      200: TallerDetalleDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P3 Editar (bloqueos con sesiones realizadas)",
  },
  cambiarAsesor: {
    method: "POST",
    path: "/api/talleres/:id/asesor",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CambiarAsesorSchema,
    responses: {
      200: TallerDetalleDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P3 Cambiar asesor con motivo",
  },
  cancelar: {
    method: "POST",
    path: "/api/talleres/:id/cancelar",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CancelarTallerSchema,
    responses: {
      200: TallerDetalleDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P1/P3 Cancelar (no se elimina con historial)",
  },
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
