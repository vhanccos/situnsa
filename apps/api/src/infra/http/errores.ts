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

/**
 * Estado HTTP de un error de dominio (mapeo único para todas las rutas):
 * 404 inexistente · 403 permiso/alcance · 409 conflicto · 400 el resto.
 */
export function estadoHttp(codigo: string): 400 | 403 | 404 | 409 {
  switch (codigo) {
    case "NO_ENCONTRADO":
      return 404;
    case "PERMISO_DENEGADO":
    case "SIN_PERMISO":
    case "FUERA_DE_ALCANCE":
      return 403;
    case "CONFLICTO_CONCURRENCIA":
    case "DATOS_DUPLICADOS":
      return 409;
    default:
      return 400;
  }
}

/** Patrón UUID (validación de parámetros en rutas nativas, sin tocar la DB). */
export const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Respuesta tipada para rutas cuyo contrato no declara 409 (el conflicto se informa como 400). */
export function respuestaError(e: { code: string; message: string }): {
  status: 400 | 403 | 404;
  body: ErrorEnvelope;
} {
  const s = estadoHttp(e.code);
  return { status: s === 409 ? 400 : s, body: errorEnvelope(e.code, e.message) };
}

/** Respuesta tipada para rutas que declaran 409 (datos duplicados / concurrencia). */
export function respuestaErrorConConflicto(e: { code: string; message: string }): {
  status: 400 | 403 | 404 | 409;
  body: ErrorEnvelope;
} {
  return { status: estadoHttp(e.code), body: errorEnvelope(e.code, e.message) };
}
