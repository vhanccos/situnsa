import { initContract } from "@ts-rest/core";
import { z } from "zod";

export const ProgramaDTOSchema = z.object({
  codigo: z.string(),
  nombre: z.string(),
});

const c = initContract();

/** Catálogos (§18: cacheables en sesión; editables solo por admin). */
export const programasContract = c.router({
  listar: {
    method: "GET",
    path: "/api/programas",
    responses: { 200: z.object({ items: z.array(ProgramaDTOSchema) }) },
    summary: "13 programas oficiales (RN-L14)",
  },
});
