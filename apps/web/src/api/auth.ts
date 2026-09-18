import { type SesionDTO, SesionDTOSchema } from "@pis/contracts";
import { apiBaseUrl } from "./client.js";

export type { SesionDTO };

/** §3 Login: valida identidad en el backend (stub dev). */
export async function loginRequest(identificador: string, password: string): Promise<SesionDTO> {
  const res = await fetch(`${apiBaseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identificador, password }),
  });
  if (!res.ok) throw new Error("Credenciales inválidas o usuario inactivo");
  return SesionDTOSchema.parse(await res.json());
}

/** Destino post-login por rol (§3 Navegación). */
export function destinoPorRol(rol: string): string {
  if (rol === "TESISTA") return "/mi-tramite";
  if (rol === "ASESOR" || rol === "JURADO") return "/asesor";
  return "/admin";
}
