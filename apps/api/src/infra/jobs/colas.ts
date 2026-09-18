import { enqueue } from "./pg-boss.client.js";

/** Colas del sistema (pg-boss sobre Postgres, sin Redis — Lean). */
export const COLA_CORREOS = "correos";
export const COLA_RECORDATORIOS = "recordatorios";

export interface CorreoPayload {
  expedienteId: string;
  codigo: string;
  texto: string;
}

export interface RecordatorioPayload {
  tipo: "revision-manual";
  notadoEn: string;
}

/**
 * Encola un correo al tesista (best-effort: si la cola cae, el flujo
 * principal ya hizo commit; el worker reintenta).
 */
export async function enqueueCorreo(payload: CorreoPayload): Promise<void> {
  try {
    await enqueue(COLA_CORREOS, payload);
  } catch (err) {
    console.error("[colas] no se pudo encolar correo", err);
  }
}
