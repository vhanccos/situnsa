import type { FastifyReply, FastifyRequest } from "fastify";
import { errorEnvelope } from "../infra/http/errores.js";
import { verificarAcceso } from "../modules/auth/sesiones.js";
import { type StubActor, stubAuth } from "./stub-auth.js";

declare module "fastify" {
  interface FastifyRequest {
    actor?: StubActor;
  }
}

/**
 * Autenticación real (Oleada A2): Bearer JWT de acceso (15 min).
 * Stub `x-user-dni` solo con `AUTH_STUB=1` (dev/curl, nunca prod).
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const auth = req.headers.authorization;
  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    const p = verificarAcceso(auth.slice("Bearer ".length).trim());
    if (p) {
      req.actor = { id: p.sub, dni: p.dni, rol: p.rol };
      return;
    }
    reply.status(401).send(errorEnvelope("SESION_INVALIDA", "Sesión expirada o inválida"));
    return;
  }
  if (process.env.AUTH_STUB === "1") {
    await stubAuth(req, reply);
    return;
  }
  reply.status(401).send(errorEnvelope("SIN_SESION", "Se requiere autenticación"));
}
