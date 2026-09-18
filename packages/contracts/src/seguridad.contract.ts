import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { ErrorEnvelopeSchema } from "./api-conventions.js";

export const RolDTOSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  esSistema: z.boolean(),
  activo: z.boolean(),
  permisos: z.array(z.string()),
});

export const PermisoDTOSchema = z.object({
  id: z.string().uuid(),
  modulo: z.string(),
  accion: z.string(),
  clave: z.string(),
});

export const ActualizarPermisosSchema = z.object({
  permisoIds: z.array(z.string().uuid()).max(90),
});

const c = initContract();

/** Administración de RBAC (port S-FIPS `PUT /roles/:id/permisos`, permiso `seguridad.*`). */
export const seguridadContract = c.router({
  listarRoles: {
    method: "GET",
    path: "/api/roles",
    responses: {
      200: z.object({ items: z.array(RolDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Roles con sus permisos",
  },
  listarPermisos: {
    method: "GET",
    path: "/api/permisos",
    responses: {
      200: z.object({ items: z.array(PermisoDTOSchema) }),
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
    },
    summary: "Catálogo de permisos modulo.accion",
  },
  actualizarPermisos: {
    method: "PUT",
    path: "/api/roles/:id/permisos",
    pathParams: z.object({ id: z.string().uuid() }),
    body: ActualizarPermisosSchema,
    responses: {
      200: RolDTOSchema,
      400: ErrorEnvelopeSchema,
      401: ErrorEnvelopeSchema,
      403: ErrorEnvelopeSchema,
      404: ErrorEnvelopeSchema,
    },
    summary: "Reemplaza los permisos de un rol (solo seguridad.editar)",
  },
});
