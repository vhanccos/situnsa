import { ParSesionSchema, type SesionDTO } from "@pis/contracts";
import { apiBaseUrl } from "./client.js";

export type { SesionDTO };

export interface ParSesion {
  usuario: SesionDTO;
  accessToken: string;
  expiraEn: number;
}

/** Login local: DNI/CUI/correo + clave (el refresh viaja en cookie HttpOnly). */
export async function loginRequest(identificador: string, password: string): Promise<ParSesion> {
  const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identificador, password }),
  });
  if (!res.ok) throw new Error("Credenciales inválidas o usuario inactivo");
  return ParSesionSchema.parse(await res.json());
}

/** Refresh rotativo con la cookie; null si no hay sesión. */
export async function refreshRequest(): Promise<{ accessToken: string; expiraEn: number } | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res.ok) return null;
    return (await res.json()) as { accessToken: string; expiraEn: number };
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    /* best effort */
  }
}

/** Sesión actual con el token vigente (post-refresh de arranque). */
export async function sesionRequest(accessToken: string): Promise<SesionDTO | null> {
  try {
    const res = await fetch(`${apiBaseUrl}/api/auth/sesion`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as SesionDTO;
  } catch {
    return null;
  }
}

/** Destino post-login por rol (§3 Navegación). */
export function destinoPorRol(rol: string): string {
  if (rol === "TESISTA") return "/mi-tramite";
  if (rol === "ASESOR" || rol === "JURADO") return "/asesor";
  return "/admin";
}
