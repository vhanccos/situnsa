import { initContract } from "@ts-rest/core";
import { z } from "zod";

export const LoginLocalSchema = z.object({
  identificador: z.string().min(2).max(255).describe("DNI, CUI o correo"),
  password: z.string().min(1).max(128),
});

export const SesionDTOSchema = z.object({
  userId: z.string().uuid(),
  dni: z.string(),
  nombres: z.string(),
  email: z.string().email(),
  rol: z.string(),
});

export type SesionDTO = z.infer<typeof SesionDTOSchema>;

const c = initContract();

export const authContract = c.router({
  loginLocal: {
    method: "POST",
    path: "/api/auth/login",
    body: LoginLocalSchema,
    responses: { 200: SesionDTOSchema, 401: z.object({ message: z.string() }) },
    summary: "§3 Login (stub dev: verifica identidad; Fase 2 Better-Auth)",
  },
  sesion: {
    method: "GET",
    path: "/api/auth/sesion",
    responses: { 200: SesionDTOSchema, 401: z.object({ message: z.string() }) },
    summary: "Sesión actual (stub: x-user-dni)",
  },
});
