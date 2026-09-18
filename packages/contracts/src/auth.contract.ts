import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

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

/** Par emitido al autenticar: acceso JWT 15min + refresh HttpOnly 8h (cookie). */
export const ParSesionSchema = z.object({
  usuario: SesionDTOSchema,
  accessToken: z.string(),
  expiraEn: z.number(),
});

const c = initContract();

export const authContract = c.router({
  loginLocal: {
    method: "POST",
    path: "/api/auth/login",
    body: LoginLocalSchema,
    responses: { 200: ParSesionSchema, 401: ErrorEnvelopeSchema },
    summary: "Login local: DNI/CUI/correo + bcrypt, bloqueo 5×15min",
  },
  loginGoogle: {
    method: "POST",
    path: "/api/auth/google",
    body: z.object({ idToken: z.string().min(10) }),
    responses: { 200: ParSesionSchema, 401: ErrorEnvelopeSchema, 501: ErrorEnvelopeSchema },
    summary: "Google OIDC: solo usuarios activos existentes (sin autocreación)",
  },
  refresh: {
    method: "POST",
    path: "/api/auth/refresh",
    body: z.object({}),
    responses: {
      200: z.object({ accessToken: z.string(), expiraEn: z.number() }),
      401: ErrorEnvelopeSchema,
    },
    summary: "Refresh rotativo (cookie HttpOnly)",
  },
  logout: {
    method: "POST",
    path: "/api/auth/logout",
    body: z.object({}),
    responses: { 200: z.object({ ok: z.literal(true) }) },
    summary: "Revoca la sesión actual",
  },
  sesion: {
    method: "GET",
    path: "/api/auth/sesion",
    responses: { 200: SesionDTOSchema, 401: ErrorEnvelopeSchema },
    summary: "Sesión actual (Bearer)",
  },
});
