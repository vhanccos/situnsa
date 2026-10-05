import { createHash, randomBytes } from "node:crypto";
import { TOKEN_ACCESO_HORAS } from "@pis/db";

export type PropositoToken = "ACTIVACION" | "RESTABLECER";

/** Token de 256 bits en base64url; en DB solo se guarda su SHA-256. */
export function nuevoTokenAcceso(ahora: Date = new Date()): {
  token: string;
  hash: string;
  expiraAt: Date;
} {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashTokenAcceso(token),
    expiraAt: new Date(ahora.getTime() + TOKEN_ACCESO_HORAS * 3_600_000),
  };
}

export function hashTokenAcceso(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Decisión pura de vigencia (testeable sin DB). */
export function tokenVigente(
  t: { usadoAt: Date | null; expiraAt: Date } | null,
  ahora: Date,
): boolean {
  return !!t && t.usadoAt === null && t.expiraAt.getTime() > ahora.getTime();
}
