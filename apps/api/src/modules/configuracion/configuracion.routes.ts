import { configuracionContract } from "@pis/contracts";
import { initServer } from "@ts-rest/fastify";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado } from "../../infra/auth/autorizacion.js";
import { respuestaErrorConConflicto } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  AgregarDocumentoUseCase,
  AgregarSubetapaUseCase,
  EditarDocumentoUseCase,
  EditarEtapaUseCase,
  EditarSubetapaUseCase,
  EliminarSubetapaUseCase,
  leerProceso,
} from "./use-cases/configuracion.use-cases.js";

const s = initServer();

/** Proceso configurable (HU-0052): solo administración del sistema (seguridad.*). */
export function registerConfiguracionRoutes(app: FastifyInstance): void {
  const router = s.router(configuracionContract, {
    verProceso: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "ver"] });
      if (!a.ok) return denegado(a);
      return { status: 200 as const, body: await leerProceso() };
    },
    editarEtapa: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new EditarEtapaUseCase().execute(
        params.numero,
        {
          ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
          ...(body.responsable !== undefined ? { responsable: body.responsable } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 200 as const, body: r.value };
    },
    agregarSubetapa: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new AgregarSubetapaUseCase().execute(params.numero, body, actor);
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 201 as const, body: r.value };
    },
    editarSubetapa: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new EditarSubetapaUseCase().execute(
        params.id,
        {
          ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
          ...(body.plazo !== undefined ? { plazo: body.plazo } : {}),
          ...(body.obligatoria !== undefined ? { obligatoria: body.obligatoria } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 200 as const, body: r.value };
    },
    eliminarSubetapa: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new EliminarSubetapaUseCase().execute(params.id, actor);
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 200 as const, body: r.value };
    },
    agregarDocumento: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new AgregarDocumentoUseCase().execute(body, actor);
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 201 as const, body: r.value };
    },
    editarDocumento: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["seguridad", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new EditarDocumentoUseCase().execute(
        params.tipo,
        {
          ...(body.nombre !== undefined ? { nombre: body.nombre } : {}),
          ...(body.obligatorio !== undefined ? { obligatorio: body.obligatorio } : {}),
          ...(body.requeridoEn !== undefined ? { requeridoEn: body.requeridoEn } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaErrorConConflicto(r.error);
      return { status: 200 as const, body: r.value };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
