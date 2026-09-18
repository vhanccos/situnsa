import { createHash } from "node:crypto";

/** Hash_n = SHA256(Hash_{n-1} + expedienteId + actor + nuevoEstado + docHash + timestamp) */
export function hashTransicion(input: {
  hashPrevio: string | null;
  expedienteId: string;
  actor: string;
  nuevoEstado: string;
  docHash?: string;
  timestamp: string;
}): string {
  const base = `${input.hashPrevio ?? "GENESIS"}|${input.expedienteId}|${input.actor}|${input.nuevoEstado}|${input.docHash ?? ""}|${input.timestamp}`;
  return createHash("sha256").update(base).digest("hex");
}
