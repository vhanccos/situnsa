import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { EstadoExpedienteSchema, ModalidadSchema } from "./enums.js";

export const InscribirPlanSchema = z.object({
  modalidad: ModalidadSchema,
  programa: z.string().min(3).max(160),
  titulo: z.string().min(10).max(500),
  participante1Dni: z.string().length(8),
  participante2Dni: z.string().length(8).optional(),
  asesorDni: z.string().length(8),
});

export const ExpedienteDTOSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  estado: EstadoExpedienteSchema,
  modalidad: ModalidadSchema,
  programa: z.string(),
  titulo: z.string(),
});

export const FiltrosExpedienteSchema = z.object({
  estado: EstadoExpedienteSchema.optional(),
  programa: z.string().optional(),
  q: z.string().optional(),
});

/** Persona resumida para la pestaña Datos (§6 INTERFACES). */
export const PersonaDTOSchema = z.object({
  id: z.string().uuid(),
  dni: z.string(),
  cui: z.string().nullable(),
  nombres: z.string(),
  apellidos: z.string(),
  email: z.string(),
  telefono: z.string().nullable(),
  rol: z.string(),
});

/** Documento del checklist (tarjeta documental §7–§8 INTERFACES). */
export const ChecklistItemDTOSchema = z.object({
  tipo: z.string(),
  nombre: z.string(),
  etapa: z.enum(["E1", "E2"]),
  obligatorio: z.boolean(),
  estado: z.enum(["PENDIENTE", "CARGADO", "OBSERVADO", "APROBADO", "RECHAZADO"]),
  documentoId: z.string().uuid().nullable(),
  version: z.number().nullable(),
  updatedAt: z.string().nullable(),
  faltantes: z.array(z.string()),
});

export const AuditoriaItemDTOSchema = z.object({
  estadoAnterior: z.string().nullable(),
  estadoNuevo: z.string(),
  actorDni: z.string().nullable(),
  createdAt: z.string(),
});

/** Detalle completo: pestañas Datos + Documentos + Resumen. */
export const ExpedienteDetalleDTOSchema = ExpedienteDTOSchema.extend({
  participante1: PersonaDTOSchema.nullable(),
  participante2: PersonaDTOSchema.nullable(),
  asesor: PersonaDTOSchema.nullable(),
  checklist: z.array(ChecklistItemDTOSchema),
  historial: z.array(AuditoriaItemDTOSchema),
  updatedAt: z.string(),
});

export type ExpedienteDetalleDTO = z.infer<typeof ExpedienteDetalleDTOSchema>;

/**
 * PATCH autoguardado (§6: DNI/correo/CUI obligatorios con formato).
 * expectedUpdatedAt = concurrencia optimista → 409 si otro guardó antes.
 */
export const ActualizarDatosSchema = z.object({
  titulo: z.string().min(10).max(500).optional(),
  programa: z.string().min(3).max(160).optional(),
  participante1Email: z.string().email().optional(),
  participante1Telefono: z.string().max(20).optional(),
  participante1Cui: z.string().max(16).optional(),
  expectedUpdatedAt: z.string().optional(),
});

export type ActualizarDatosInput = z.infer<typeof ActualizarDatosSchema>;

const c = initContract();

export const expedientesContract = c.router({
  inscribirPlan: {
    method: "POST",
    path: "/expedientes/inscribir-plan",
    body: InscribirPlanSchema,
    responses: {
      201: ExpedienteDTOSchema,
      400: z.object({ message: z.string(), code: z.string() }),
    },
    summary: "RF-01: Inscribir plan de tesis",
  },
  getById: {
    method: "GET",
    path: "/expedientes/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: { 200: ExpedienteDetalleDTOSchema, 404: z.object({ message: z.string() }) },
    summary: "Detalle del expediente (pestañas Datos/Documentos/Resumen)",
  },
  actualizarDatos: {
    method: "PATCH",
    path: "/expedientes/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ActualizarDatosSchema,
    responses: {
      200: ExpedienteDetalleDTOSchema,
      404: z.object({ message: z.string() }),
      409: z.object({ message: z.string(), updatedAt: z.string() }),
    },
    summary: "Autoguardado de Datos (§6 INTERFACES)",
  },
  listar: {
    method: "GET",
    path: "/expedientes",
    query: FiltrosExpedienteSchema,
    responses: { 200: z.object({ items: z.array(ExpedienteDTOSchema), total: z.number() }) },
    summary: "Listar expedientes con filtros",
  },
});

export type InscribirPlanInput = z.infer<typeof InscribirPlanSchema>;
