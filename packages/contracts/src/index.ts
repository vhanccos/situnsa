import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { authContract } from "./auth.contract.js";
import { documentosContract } from "./documentos.contract.js";
import { expedientesContract } from "./expedientes.contract.js";
import { gruposContract, reportesContract } from "./grupos-pagos.contract.js";
import { programasContract } from "./programas.contract.js";
import { seguimientoContract } from "./seguimiento.contract.js";
import { seguridadContract } from "./seguridad.contract.js";
import { asesoresContract, talleresContract } from "./talleres.contract.js";

const c = initContract();

export const appContract = c.router({
  expedientes: expedientesContract,
  auth: authContract,
  documentos: documentosContract,
  talleres: talleresContract,
  asesores: asesoresContract,
  seguridad: seguridadContract,
  seguimiento: seguimientoContract,
  grupos: gruposContract,
  reportes: reportesContract,
  programas: programasContract,
  health: {
    method: "GET",
    path: "/api/health",
    responses: { 200: z.object({ ok: z.literal(true), version: z.string() }) },
    summary: "Healthcheck",
  },
});

export * from "./api-conventions.js";
export * from "./auth.contract.js";
export * from "./documentos.contract.js";
export * from "./enums.js";
export * from "./expedientes.contract.js";
export * from "./grupos-pagos.contract.js";
export * from "./programas.contract.js";
export * from "./seguimiento.contract.js";
export * from "./seguridad.contract.js";
export * from "./talleres.contract.js";
