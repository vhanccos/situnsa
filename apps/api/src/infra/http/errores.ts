import { randomUUID } from "node:crypto";
import type { ErrorEnvelope } from "@pis/contracts";

/**
 * Errores homogéneos API v1 (port S-FIPS API.md):
 * `{ error: { codigo, mensaje, correlacion, detalles? } }`.
 * Nunca solo texto: todo error lleva código estable + correlación para el log.
 */
export function nuevaCorrelacion(): string {
  return randomUUID();
}

export function errorEnvelope(
  codigo: string,
  mensaje: string,
  detalles?: Array<{ campo?: string; mensaje?: string; subetapa?: string; estado?: string }>,
  correlacion: string = nuevaCorrelacion(),
): ErrorEnvelope {
  return {
    error: {
      codigo,
      mensaje,
      correlacion,
      ...(detalles ? { detalles } : {}),
    },
  };
}

/** Lee el mensaje legible de un cuerpo de error (sobre nuevo y legacy `{message}`). */
export function mensajeDeError(body: unknown, respaldo = "Error inesperado"): string {
  if (typeof body !== "object" || body === null) return respaldo;
  const env = (body as { error?: { mensaje?: unknown } }).error;
  if (typeof env?.mensaje === "string" && env.mensaje) return env.mensaje;
  const legacy = (body as { message?: unknown }).message;
  if (typeof legacy === "string" && legacy) return legacy;
  return respaldo;
}
