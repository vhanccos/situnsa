import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

const FechaCorta = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha AAAA-MM-DD");

export const EstadoCumplimientoSchema = z.enum(["PENDIENTE", "CUMPLIDA", "OBSERVADA"]);
export const EstadoEntregaSchema = z.enum(["ENTREGADA", "CONFORME", "OBSERVADA"]);

export const FaseDTOSchema = z.object({
  id: z.string().uuid(),
  tallerId: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  fechaRef: z.string().nullable(),
  orden: z.number(),
});

export const CrearFaseSchema = z.object({
  nombre: z.string().min(3, "El nombre debe tener al menos 3 letras").max(160),
  descripcion: z.string().max(1000).optional(),
  fechaRef: FechaCorta.optional(),
});

export const MarcarCumplimientoSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  estado: EstadoCumplimientoSchema,
  /** Obligatorio cuando es OBSERVADA. */
  comentario: z.string().max(1000).optional(),
});

export const CeldaMatrizSchema = z.object({
  faseId: z.string().uuid(),
  estado: EstadoCumplimientoSchema,
  comentario: z.string().nullable(),
});

export const FilaMatrizSchema = z.object({
  usuarioDni: z.string(),
  nombres: z.string(),
  celdas: z.array(CeldaMatrizSchema),
  fasesCompletas: z.boolean(),
});

export const SolicitarAvanceSchema = z.object({
  sesionId: z.string().uuid().optional(),
  descripcion: z.string().min(5, "Describe qué debe entregar el alumno").max(1000),
  plazo: FechaCorta,
});

export const TallerEntregaDTOSchema = z.object({
  id: z.string().uuid(),
  usuarioDni: z.string(),
  nombres: z.string(),
  version: z.number(),
  estado: EstadoEntregaSchema,
  observacion: z.string().nullable(),
  createdAt: z.string(),
});

export const TallerAvanceDTOSchema = z.object({
  id: z.string().uuid(),
  tallerId: z.string().uuid(),
  sesionNro: z.number().nullable(),
  descripcion: z.string(),
  plazo: z.string(),
  entregas: z.array(TallerEntregaDTOSchema),
});

export const RevisarEntregaSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  estado: z.enum(["CONFORME", "OBSERVADO"]),
  observacion: z.string().max(1000).optional(),
});

export const PaseAlumnoDTOSchema = z.object({
  usuarioDni: z.string(),
  nombres: z.string(),
  fasesCompletas: z.boolean(),
  validacionAsesor: z.boolean(),
  asistenciaPct: z.number(),
  cuotasAlDia: z.boolean().nullable(),
  elegible: z.boolean(),
  faltantes: z.array(z.string()),
  avisos: z.array(z.string()),
  pase: z
    .object({ validadoPor: z.string(), validadoDni: z.string(), createdAt: z.string() })
    .nullable(),
});

export const ValidarPaseSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
});

export const RevertirPaseSchema = z.object({
  usuarioDni: z.string().regex(/^\d{8}$/, "DNI debe tener 8 dígitos"),
  motivo: z.string().min(5, "Cuenta el motivo de la reversión").max(500),
});

export type FaseDTO = z.infer<typeof FaseDTOSchema>;
export type TallerAvanceDTO = z.infer<typeof TallerAvanceDTOSchema>;
export type TallerEntregaDTO = z.infer<typeof TallerEntregaDTOSchema>;
export type PaseAlumnoDTO = z.infer<typeof PaseAlumnoDTOSchema>;

const c = initContract();

/** P6 Agenda del asesor + P5 alertas + P7 avances y fases (RF-0207 a RF-0210). */
export const tallerAvancesContract = c.router({
  listarFases: {
    method: "GET",
    path: "/api/talleres/:id/fases",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({
        fases: z.array(FaseDTOSchema),
        matriz: z.array(FilaMatrizSchema),
      }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Fases y matriz alumno × fase",
  },
  crearFase: {
    method: "POST",
    path: "/api/talleres/:id/fases",
    pathParams: z.object({ id: z.string().uuid() }),
    body: CrearFaseSchema,
    responses: {
      201: FaseDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Agregar fase",
  },
  marcarCumplimiento: {
    method: "POST",
    path: "/api/fases/:id/cumplimiento",
    pathParams: z.object({ id: z.string().uuid() }),
    body: MarcarCumplimientoSchema,
    responses: {
      200: FilaMatrizSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Marcar cumplimiento (observada exige comentario)",
  },
  listarAvances: {
    method: "GET",
    path: "/api/talleres/:id/avances",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ items: z.array(TallerAvanceDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6/P7 Avances solicitados y entregas",
  },
  solicitarAvance: {
    method: "POST",
    path: "/api/talleres/:id/avances",
    pathParams: z.object({ id: z.string().uuid() }),
    body: SolicitarAvanceSchema,
    responses: {
      201: TallerAvanceDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Solicitar avance (notifica al alumno)",
  },
  revisarEntrega: {
    method: "POST",
    path: "/api/avances/:id/revisiones",
    pathParams: z.object({ id: z.string().uuid() }),
    body: RevisarEntregaSchema,
    responses: {
      200: TallerEntregaDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Revisar entrega (Conforme u Observado)",
  },
  pases: {
    method: "GET",
    path: "/api/talleres/:id/pases",
    pathParams: z.object({ id: z.string().uuid() }),
    responses: {
      200: z.object({ items: z.array(PaseAlumnoDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Condiciones por alumno para pasar a Plan",
  },
  validarPase: {
    method: "POST",
    path: "/api/talleres/:id/pases",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ValidarPaseSchema,
    responses: {
      200: PaseAlumnoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Validar y pasar a Plan de tesis",
  },
  revertirPase: {
    method: "POST",
    path: "/api/talleres/:id/pases/revertir",
    pathParams: z.object({ id: z.string().uuid() }),
    body: RevertirPaseSchema,
    responses: {
      200: PaseAlumnoDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "P6 Revertir pase (solo admin, con motivo)",
  },
});
