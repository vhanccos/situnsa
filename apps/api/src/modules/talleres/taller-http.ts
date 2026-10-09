import { db } from "@pis/db";
import { esPersonal, type Perfil } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { tallerPorId, usuarioEnTaller } from "./taller-alcance.js";
import { appendAuditoriaTaller } from "./taller-auditoria.js";

export type Alcance =
  | { ok: true }
  | { ok: false; status: 403 | 404; body: ReturnType<typeof errorEnvelope> };

/**
 * RN-07 + Fase A (§2 spec): el personal ve todo; el asesor solo sus talleres;
 * el tesista solo el suyo. La denegación por alcance queda en el historial.
 */
export async function alcanceTaller(
  tallerId: string,
  actor: { id: string; dni: string },
  perfil: Perfil,
): Promise<Alcance> {
  if (esPersonal(perfil.roles)) return { ok: true };
  const t = await tallerPorId(db, tallerId);
  if (!t) {
    return { ok: false, status: 404, body: errorEnvelope("NO_ENCONTRADO", "Taller no encontrado") };
  }
  if (perfil.roles.includes("ASESOR") && t.asesorId === actor.id) return { ok: true };
  const grupoId = await usuarioEnTaller(db, tallerId, actor.id);
  if (grupoId) return { ok: true };
  await appendAuditoriaTaller(db, {
    tallerId,
    actorId: actor.id,
    actorDni: actor.dni,
    accion: "ACCESO_DENEGADO",
    detalle: "Fuera de alcance del taller",
  });
  return {
    ok: false,
    status: 403,
    body: errorEnvelope("FUERA_DE_ALCANCE", "El taller no está en tu alcance"),
  };
}

/** NO_ENCONTRADO → 404, resto de negocio → 400 (el alcance ya se verificó antes). */
export function errorUso(e: {
  code: string;
  message: string;
}):
  | { status: 404; body: ReturnType<typeof errorEnvelope> }
  | { status: 400; body: ReturnType<typeof errorEnvelope> } {
  if (e.code === "NO_ENCONTRADO") return { status: 404, body: errorEnvelope(e.code, e.message) };
  return { status: 400, body: errorEnvelope(e.code, e.message) };
}
