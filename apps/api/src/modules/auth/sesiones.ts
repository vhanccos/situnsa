import { createHash, randomBytes } from "node:crypto";
import { ACCESO_MINUTOS, BLOQUEO_MINUTOS, MAX_INTENTOS, REFRESH_HORAS } from "@pis/db";
import jwt from "jsonwebtoken";

export { ACCESO_MINUTOS, BLOQUEO_MINUTOS, MAX_INTENTOS, REFRESH_HORAS };

let avisoSecreto = false;

/** Secreto HS256: `JWT_SECRET` en prod; fallback dev con aviso (nunca en prod). */
export function secretoJwt(): string {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET ausente (mínimo 32 caracteres)");
  }
  if (!avisoSecreto) {
    avisoSecreto = true;
    console.warn("[auth] JWT_SECRET ausente: usando secreto de desarrollo (no usar en prod)");
  }
  return "dev-secret-solo-desarrollo-no-usar-en-prod-123456";
}

export interface PayloadAcceso {
  sub: string;
  dni: string;
  rol: string;
}

/** JWT de acceso, 15 min (S-FIPS). */
export function firmarAcceso(p: PayloadAcceso): string {
  return jwt.sign({ ...p, tipo: "access" }, secretoJwt(), {
    algorithm: "HS256",
    expiresIn: `${ACCESO_MINUTOS}m`,
  });
}

/** null si inválido/expirado/tipo incorrecto (nunca throw). */
export function verificarAcceso(token: string): PayloadAcceso | null {
  try {
    const d = jwt.verify(token, secretoJwt(), { algorithms: ["HS256"] }) as Record<string, unknown>;
    if (d.tipo !== "access" || typeof d.sub !== "string") return null;
    return { sub: d.sub, dni: String(d.dni ?? ""), rol: String(d.rol ?? "") };
  } catch {
    return null;
  }
}

/** Refresh opaco de 48 bytes; en DB solo se guarda el sha256. */
export function nuevoRefresh(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefresh(token) };
}

export function hashRefresh(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function expiracionRefresh(desde: Date = new Date()): Date {
  return new Date(desde.getTime() + REFRESH_HORAS * 3_600_000);
}

/** Cookie HttpOnly SameSite=Strict 8h (Secure solo en prod/https). */
export function opcionesCookieRefresh(): {
  httpOnly: boolean;
  sameSite: "strict";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: REFRESH_HORAS * 3_600,
  };
}

export const NOMBRE_COOKIE_REFRESH = "pis_refresh";

/** Lógica pura de bloqueo: 5 fallos → 15 min (S-FIPS). Testeable sin DB. */
export function proximoEstadoIntento(
  fallidosPrevios: number,
  exito: boolean,
  ahora: Date,
): { fallidos: number; bloqueadoHasta: Date | null } {
  if (exito) return { fallidos: 0, bloqueadoHasta: null };
  const fallidos = fallidosPrevios + 1;
  if (fallidos >= MAX_INTENTOS) {
    return { fallidos: 0, bloqueadoHasta: new Date(ahora.getTime() + BLOQUEO_MINUTOS * 60_000) };
  }
  return { fallidos, bloqueadoHasta: null };
}

export function estaBloqueado(bloqueadoHasta: Date | null, ahora: Date): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta.getTime() > ahora.getTime();
}
