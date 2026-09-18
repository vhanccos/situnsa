import { initContract } from "@ts-rest/core";
import { z } from "zod";

export const LoginLocalSchema = z.object({
  identificador: z.string().min(8).max(255).describe("DNI o correo"),
  password: z.string().min(8).max(128),
});

export const SesionDTOSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  rol: z.string(),
});

const c = initContract();

export const authContract = c.router({
  loginLocal: {
    method: "POST",
    path: "/auth/login",
    body: LoginLocalSchema,
    responses: { 200: SesionDTOSchema, 401: z.object({ message: z.string() }) },
    summary: "Login híbrido DNI/correo (Google OAuth = fase posterior)",
  },
  sesion: {
    method: "GET",
    path: "/auth/sesion",
    responses: { 200: SesionDTOSchema, 401: z.object({ message: z.string() }) },
    summary: "Sesión actual",
  },
});
