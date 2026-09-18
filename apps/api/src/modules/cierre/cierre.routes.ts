import { cierreContract } from "@pis/contracts";
import {
  db,
  expedientes,
  jurados,
  juradosExpediente,
  sustentaciones,
  validacionesInstitucionales,
} from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  DesignarJuradoUseCase,
  DictaminarUseCase,
  ProgramarSustentacionUseCase,
  RegistrarActaUseCase,
  RegistrarValidacionUseCase,
} from "./use-cases/cierre.use-cases.js";

const s = initServer();

async function dtoCierre(expedienteId: string) {
  const exp = await db
    .select({ id: expedientes.id, estado: expedientes.estado })
    .from(expedientes)
    .where(eq(expedientes.id, expedienteId))
    .limit(1);
  const row = exp[0];
  if (!row) return null;
  const vinc = await db
    .select()
    .from(juradosExpediente)
    .where(eq(juradosExpediente.expedienteId, expedienteId));
  const cat = await db.select().from(jurados);
  const porId = new Map(cat.map((j) => [j.id, j]));
  const sust = await db
    .select()
    .from(sustentaciones)
    .where(eq(sustentaciones.expedienteId, expedienteId))
    .limit(1);
  const vals = await db
    .select()
    .from(validacionesInstitucionales)
    .where(eq(validacionesInstitucionales.expedienteId, expedienteId));
  const s0 = sust[0];
  return {
    expedienteId: row.id,
    estado: row.estado,
    jurados: vinc.map((v) => {
      const j = porId.get(v.juradoId);
      return {
        id: v.id,
        dni: j?.dni ?? "—",
        nombres: j ? `${j.nombres} ${j.apellidos}` : "—",
        grado: j?.grado ?? null,
        rol: v.rol,
        dictamen: v.dictamen,
      };
    }),
    sustentacion: s0
      ? {
          id: s0.id,
          fecha: s0.fecha,
          hora: s0.hora,
          lugar: s0.lugar,
          modalidad: s0.modalidad,
          actaVeredicto: s0.actaVeredicto,
        }
      : null,
    validaciones: vals.map((v) => ({
      id: v.id,
      instancia: v.instancia,
      estado: v.estado,
      detalle: v.detalle,
    })),
  };
}

/** Cierre del trámite (Oleada D, RF-04…RF-07). */
export function registerCierreRoutes(app: FastifyInstance): void {
  const router = s.router(cierreContract, {
    verCierre: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "ver"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const dto = await dtoCierre(params.id);
      if (!dto)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Expediente no encontrado"),
        };
      return { status: 200 as const, body: dto };
    },
    designarJurado: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "crear"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new DesignarJuradoUseCase();
      const r = await uc.execute(
        params.id,
        {
          dni: body.dni,
          nombres: body.nombres,
          apellidos: body.apellidos,
          ...(body.grado !== undefined ? { grado: body.grado } : {}),
          rol: body.rol,
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const dto = await dtoCierre(params.id);
      const j = dto?.jurados.find((x) => x.id === r.value.id);
      if (!j)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo designar"),
        };
      return { status: 201 as const, body: j };
    },
    dictaminar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "editar"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new DictaminarUseCase();
      const r = await uc.execute(
        params.id,
        params.juradoId,
        {
          dictamen: body.dictamen,
          ...(body.comentario !== undefined ? { comentario: body.comentario } : {}),
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const dto = await dtoCierre(params.id);
      const j = dto?.jurados.find((x) => x.id === r.value.id);
      if (!j)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo dictaminar"),
        };
      return { status: 200 as const, body: j };
    },
    programarSustentacion: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "crear"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ProgramarSustentacionUseCase();
      const r = await uc.execute(
        params.id,
        {
          fecha: body.fecha,
          hora: body.hora,
          lugar: body.lugar,
          modalidad: body.modalidad,
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const dto = await dtoCierre(params.id);
      if (!dto?.sustentacion)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo programar"),
        };
      return { status: 200 as const, body: dto.sustentacion };
    },
    registrarActa: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "aprobar"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new RegistrarActaUseCase();
      const r = await uc.execute(params.id, body.veredicto, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const dto = await dtoCierre(params.id);
      if (!dto?.sustentacion)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo registrar el acta"),
        };
      return { status: 200 as const, body: dto.sustentacion };
    },
    registrarValidacion: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["validaciones", "aprobar"],
        expedienteId: params.id,
      });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        if (a.status === 404) return { status: 404 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new RegistrarValidacionUseCase();
      const r = await uc.execute(
        params.id,
        {
          instancia: body.instancia,
          estado: body.estado,
          ...(body.detalle !== undefined ? { detalle: body.detalle } : {}),
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      const dto = await dtoCierre(params.id);
      const v = dto?.validaciones.find((x) => x.id === r.value.id);
      if (!v)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo registrar"),
        };
      return { status: 200 as const, body: v };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}
