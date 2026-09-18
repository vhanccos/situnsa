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
    responses: { 200: ExpedienteDTOSchema, 404: z.object({ message: z.string() }) },
    summary: "Detalle de expediente",
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
