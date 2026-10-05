import { basename } from "node:path";
import type { FastifyReply } from "fastify";
import type { LocalStorageService } from "../storage/local-storage.service.js";
import { errorEnvelope } from "./errores.js";

/**
 * Entrega de archivos protegidos: en producción (detrás de Nginx) responde
 * `X-Accel-Redirect` y Nginx transmite el archivo (0 MB en Node); sin Nginx
 * (desarrollo) lo transmite como stream, nunca como buffer completo.
 * Forzar con DOCS_ENTREGA=accel|stream.
 */
export function modoEntrega(): "accel" | "stream" {
  const forzado = process.env.DOCS_ENTREGA;
  if (forzado === "accel" || forzado === "stream") return forzado;
  return process.env.NODE_ENV === "production" ? "accel" : "stream";
}

export async function entregarArchivo(
  reply: FastifyReply,
  storage: LocalStorageService,
  ruta: string,
  opciones: { nombre?: string; inline?: boolean } = {},
): Promise<void> {
  const nombre = (opciones.nombre ?? basename(ruta)).replace(/[^A-Za-z0-9._-]/g, "_");
  const disposicion = `${opciones.inline ? "inline" : "attachment"}; filename="${nombre}"`;
  if (modoEntrega() === "accel") {
    const accel = storage.accelPath(ruta);
    if (!accel) {
      await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Archivo no disponible"));
      return;
    }
    await reply
      .header("X-Accel-Redirect", accel)
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", disposicion)
      .status(200)
      .send();
    return;
  }
  const archivo = await storage.abrir(ruta);
  if (!archivo) {
    await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Archivo no disponible"));
    return;
  }
  await reply
    .header("Content-Type", "application/pdf")
    .header("Content-Length", String(archivo.bytes))
    .header("Content-Disposition", disposicion)
    .header("Cache-Control", "private, no-store")
    .status(200)
    .send(archivo.stream);
}
