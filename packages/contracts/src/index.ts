import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { authContract } from "./auth.contract.js";
import { documentosContract } from "./documentos.contract.js";
import { expedientesContract } from "./expedientes.contract.js";

const c = initContract();

export const appContract = c.router({
  expedientes: expedientesContract,
  auth: authContract,
  documentos: documentosContract,
  health: {
    method: "GET",
    path: "/health",
    responses: { 200: z.object({ ok: z.literal(true), version: z.string() }) },
    summary: "Healthcheck",
  },
});

export * from "./auth.contract.js";
export * from "./documentos.contract.js";
export * from "./enums.js";
export * from "./expedientes.contract.js";
