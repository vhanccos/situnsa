import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

/**
 * Proceso configurable (HU-0052, ADR-0004 S-FIPS): etapas, subetapas y
 * documentos requeridos se editan como datos. Las subetapas del sistema
 * (con clave) conservan sus reglas de avance: se pueden renombrar o cambiar
 * su plazo, pero no eliminar; las agregadas por el administrador no tienen
 * guardas. Los cambios aplican a los expedientes que se validen después.
 */

export const SubetapaConfigDTOSchema = z.object({
  id: z.string().uuid(),
  orden: z.number(),
  clave: z.string().nullable(),
  nombre: z.string(),
  plazo: z.string().nullable(),
  obligatoria: z.boolean(),
});

export const EtapaConfigDTOSchema = z.object({
  numero: z.number(),
  nombre: z.string(),
  responsable: z.string(),
  activa: z.boolean(),
  subetapas: z.array(SubetapaConfigDTOSchema),
});

export const DocumentoConfigDTOSchema = z.object({
  tipo: z.string(),
  nombre: z.string(),
  etapa: z.enum(["E1", "E2"]),
  obligatorio: z.boolean(),
  requeridoEn: z.string().nullable(),
});

export const ProcesoConfigDTOSchema = z.object({
  etapas: z.array(EtapaConfigDTOSchema),
  documentos: z.array(DocumentoConfigDTOSchema),
});

const textoPlazo = z.string().trim().min(2).max(120);

export const EditarEtapaSchema = z.object({
  nombre: z.string().trim().min(3).max(160).optional(),
  responsable: z.string().email("Correo del responsable inválido").optional(),
});

export const NuevaSubetapaSchema = z.object({
  nombre: z.string().trim().min(3).max(160),
  plazo: textoPlazo,
  obligatoria: z.boolean().default(true),
});

export const EditarSubetapaSchema = z.object({
  nombre: z.string().trim().min(3).max(160).optional(),
  plazo: textoPlazo.optional(),
  obligatoria: z.boolean().optional(),
});

export const NuevoDocumentoSchema = z.object({
  tipo: z
    .string()
    .regex(/^[A-Z][A-Z0-9_]{2,63}$/, "Tipo en MAYÚSCULAS_CON_GUIONES (ej. CONSTANCIA_EGRESADO)"),
  nombre: z.string().trim().min(3).max(200),
  etapa: z.enum(["E1", "E2"]),
  obligatorio: z.boolean().default(true),
  requeridoEn: z.string().max(40).nullable().optional(),
});

export const EditarDocumentoSchema = z.object({
  nombre: z.string().trim().min(3).max(200).optional(),
  obligatorio: z.boolean().optional(),
  requeridoEn: z.string().max(40).nullable().optional(),
});

const c = initContract();

const errores = {
  400: ErrorEnvelopeSchema,
  401: ErrorEnvelopeSchema,
  403: ErrorEnvelopeSchema,
  404: ErrorEnvelopeSchema,
  409: ErrorEnvelopeSchema,
} as const;

export const configuracionContract = c.router({
  verProceso: {
    method: "GET",
    path: "/api/configuracion/proceso",
    responses: { 200: ProcesoConfigDTOSchema, ...errores },
    summary: "Etapas, subetapas y documentos requeridos vigentes",
  },
  editarEtapa: {
    method: "PATCH",
    path: "/api/configuracion/etapas/:numero",
    pathParams: z.object({ numero: z.coerce.number().int().min(1).max(20) }),
    body: EditarEtapaSchema,
    responses: { 200: ProcesoConfigDTOSchema, ...errores },
    summary: "Renombra la etapa o cambia su responsable por defecto",
  },
  agregarSubetapa: {
    method: "POST",
    path: "/api/configuracion/etapas/:numero/subetapas",
    pathParams: z.object({ numero: z.coerce.number().int().min(1).max(20) }),
    body: NuevaSubetapaSchema,
    responses: { 201: ProcesoConfigDTOSchema, ...errores },
    summary: "Agrega una subetapa personalizada al final de la etapa",
  },
  editarSubetapa: {
    method: "PATCH",
    path: "/api/configuracion/subetapas/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: EditarSubetapaSchema,
    responses: { 200: ProcesoConfigDTOSchema, ...errores },
    summary: "Edita nombre/plazo (y obligatoriedad de las personalizadas)",
  },
  eliminarSubetapa: {
    method: "DELETE",
    path: "/api/configuracion/subetapas/:id",
    pathParams: z.object({ id: z.string().uuid() }),
    body: z.object({}).optional(),
    responses: { 200: ProcesoConfigDTOSchema, ...errores },
    summary: "Elimina una subetapa personalizada (las del sistema no se eliminan)",
  },
  agregarDocumento: {
    method: "POST",
    path: "/api/configuracion/documentos",
    body: NuevoDocumentoSchema,
    responses: { 201: ProcesoConfigDTOSchema, ...errores },
    summary: "Agrega un documento requerido al checklist",
  },
  editarDocumento: {
    method: "PATCH",
    path: "/api/configuracion/documentos/:tipo",
    pathParams: z.object({ tipo: z.string().min(2).max(64) }),
    body: EditarDocumentoSchema,
    responses: { 200: ProcesoConfigDTOSchema, ...errores },
    summary: "Edita nombre, obligatoriedad o subetapa que exige el documento",
  },
});

export type ProcesoConfigDTO = z.infer<typeof ProcesoConfigDTOSchema>;
