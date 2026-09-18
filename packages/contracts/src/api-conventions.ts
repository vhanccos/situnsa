import { z } from "zod";

/**
 * Convenciones API v1 (port ADR S-FIPS API.md):
 * - Errores homogéneos `{ error: { codigo, mensaje, correlacion, detalles? } }`.
 * - Paginación `page/limit` con metadatos `total/page/limit`.
 * - `Idempotency-Key` en creaciones críticas (cabecera, sin cambio de contrato).
 */

/** Códigos de error estables (nunca solo texto). */
export const CodigoErrorSchema = z.string().min(2).max(64);

export const DetalleErrorSchema = z.object({
  campo: z.string().optional(),
  mensaje: z.string().optional(),
  subetapa: z.string().optional(),
  estado: z.string().optional(),
});

export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    codigo: CodigoErrorSchema,
    mensaje: z.string().min(1).max(2000),
    correlacion: z.string().uuid(),
    detalles: z.array(DetalleErrorSchema).optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/** Query de paginación: page ≥1, limit 1–100 (default 1/20). */
export const PaginacionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginacionQuery = z.infer<typeof PaginacionQuerySchema>;

/** Metadatos de paginación que acompañan a todo listado. */
export const PaginacionMetaSchema = z.object({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type PaginacionMeta = z.infer<typeof PaginacionMetaSchema>;
