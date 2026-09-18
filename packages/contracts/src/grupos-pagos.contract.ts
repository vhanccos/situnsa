import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const GrupoDTOSchema = z.object({
  id: z.string().uuid(),
  tallerId: z.string().uuid(),
  tallerNombre: z.string(),
  nombre: z.string(),
  asesorNombre: z.string().nullable(),
  estado: z.enum(["PLANIFICADO", "ACTIVO", "CONCLUIDO"]),
  miembros: z.number(),
  cuotasPendientes: z.number(),
});

export const CrearGrupoSchema = z.object({
  tallerId: z.string().uuid(),
  nombre: z.string().min(3).max(160),
  asesorDni: z.string().length(8).optional(),
});

export const AgregarMiembroSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
});

export const ProgramarPensionesSchema = z.object({
  nroCuotas: z.number().int().min(1).max(24),
  monto: z.number().int().min(1).max(100000),
  primerVencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha YYYY-MM-DD"),
});

export const PensionProgramadaDTOSchema = z.object({
  grupoId: z.string().uuid(),
  cuotas: z.number(),
  miembros: z.number(),
});

export const RegistrarPagoSchema = z.object({
  cronogramaId: z.string().uuid(),
  monto: z.number().int().min(1),
  medio: z.string().min(2).max(32).default("CAJA"),
  referencia: z.string().max(64).optional(),
});

export const PagoDTOSchema = z.object({
  id: z.string().uuid(),
  cronogramaId: z.string().uuid(),
  monto: z.number(),
  medio: z.string(),
  estado: z.string(),
});

export const CuotaDTOSchema = z.object({
  id: z.string().uuid(),
  usuarioDni: z.string(),
  nombres: z.string(),
  nroCuota: z.number(),
  monto: z.number(),
  vencimiento: z.string(),
  estado: z.string(),
});

export const DeudorDTOSchema = z.object({
  usuarioId: z.string().uuid(),
  dni: z.string(),
  nombres: z.string(),
  grupoId: z.string().uuid(),
  grupoNombre: z.string(),
  cuotasVencidas: z.number(),
  deudaTotal: z.number(),
});

const c = initContract();

/** Grupos y pensiones del taller (Oleada C, HU-0011/12/14/15). */
export const gruposContract = c.router({
  listar: {
    method: "GET",
    path: "/api/grupos",
    responses: {
      200: z.object({ items: z.array(GrupoDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Grupos de taller con conteos",
  },
  crear: {
    method: "POST",
    path: "/api/grupos",
    body: CrearGrupoSchema,
    responses: {
      201: GrupoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Nuevo grupo (HU-0011/0012)",
  },
  agregarMiembro: {
    method: "POST",
    path: "/api/grupos/:id/miembros",
    pathParams: z.object({ id: z.string().uuid() }),
    body: AgregarMiembroSchema,
    responses: {
      201: z.object({ grupoId: z.string().uuid(), usuarioId: z.string().uuid() }),
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Asignación manual a grupo (HU-0011)",
  },
  programarPensiones: {
    method: "POST",
    path: "/api/grupos/:id/pensiones",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ProgramarPensionesSchema,
    responses: {
      201: PensionProgramadaDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Cronograma de pensiones del grupo (HU-0014)",
  },
  listarCuotas: {
    method: "GET",
    path: "/api/grupos/:id/cuotas",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ items: z.array(CuotaDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Cuotas del grupo con tesista y estado",
  },
  registrarPago: {
    method: "POST",
    path: "/api/pagos",
    body: RegistrarPagoSchema,
    responses: {
      201: PagoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Registro de pago de cuota (HU-0015)",
  },
});

export const reportesContract = c.router({
  deudores: {
    method: "GET",
    path: "/api/reportes/deudores",
    responses: {
      200: z.object({ items: z.array(DeudorDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Tesistas con cuotas vencidas (HU-0015)",
  },
});
