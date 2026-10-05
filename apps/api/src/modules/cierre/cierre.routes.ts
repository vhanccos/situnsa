import { cierreContract } from "@pis/contracts";
import {
  db,
  expedientes,
  jurados,
  juradosExpediente,
  propuestasSustentacion,
  sustentaciones,
  usuarios,
  validacionesInstitucionales,
} from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { asc, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado } from "../../infra/auth/autorizacion.js";
import { errorEnvelope, respuestaError } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  DesignarJuradoUseCase,
  DictaminarUseCase,
  ProgramarSustentacionUseCase,
  ProponerFechasSustentacionUseCase,
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
    .select({
      id: juradosExpediente.id,
      instancia: juradosExpediente.instancia,
      rol: juradosExpediente.rol,
      dictamen: juradosExpediente.dictamen,
      comentario: juradosExpediente.comentario,
      dni: jurados.dni,
      nombres: jurados.nombres,
      apellidos: jurados.apellidos,
      grado: jurados.grado,
    })
    .from(juradosExpediente)
    .innerJoin(jurados, eq(jurados.id, juradosExpediente.juradoId))
    .where(eq(juradosExpediente.expedienteId, expedienteId))
    .orderBy(asc(juradosExpediente.createdAt));
  const sust = await db
    .select()
    .from(sustentaciones)
    .where(eq(sustentaciones.expedienteId, expedienteId))
    .limit(1);
  const propuestas = await db
    .select({
      id: propuestasSustentacion.id,
      desde: propuestasSustentacion.desde,
      hasta: propuestasSustentacion.hasta,
      comentario: propuestasSustentacion.comentario,
      createdAt: propuestasSustentacion.createdAt,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(propuestasSustentacion)
    .leftJoin(usuarios, eq(usuarios.id, propuestasSustentacion.propuestaPor))
    .where(eq(propuestasSustentacion.expedienteId, expedienteId))
    .orderBy(desc(propuestasSustentacion.createdAt))
    .limit(1);
  const vals = await db
    .select()
    .from(validacionesInstitucionales)
    .where(eq(validacionesInstitucionales.expedienteId, expedienteId))
    .orderBy(asc(validacionesInstitucionales.createdAt));
  const s0 = sust[0];
  const p0 = propuestas[0];
  return {
    expedienteId: row.id,
    estado: row.estado,
    jurados: vinc.map((v) => ({
      id: v.id,
      dni: v.dni,
      nombres: `${v.nombres} ${v.apellidos}`,
      grado: v.grado,
      instancia: v.instancia === "TERNA" ? ("TERNA" as const) : ("JURADO" as const),
      rol: v.rol,
      dictamen: v.dictamen,
      comentario: v.comentario,
    })),
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
    propuesta: p0
      ? {
          id: p0.id,
          desde: p0.desde,
          hasta: p0.hasta,
          comentario: p0.comentario,
          propuestaPor: p0.nombres ? `${p0.nombres} ${p0.apellidos ?? ""}`.trim() : null,
          createdAt: p0.createdAt.toISOString(),
        }
      : null,
    validaciones: vals.map((v) => ({
      id: v.id,
      instancia: v.instancia,
      estado: v.estado,
      porcentaje: v.porcentaje,
      detalle: v.detalle,
    })),
  };
}

const noEncontrado = (mensaje: string) => ({
  status: 404 as const,
  body: errorEnvelope("NO_ENCONTRADO", mensaje),
});

/** Cierre del trámite (RF-04…RF-07): terna/jurados, sustentación y validaciones. */
export function registerCierreRoutes(app: FastifyInstance): void {
  const router = s.router(cierreContract, {
    verCierre: async ({ params, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "ver"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const dto = await dtoCierre(params.id);
      if (!dto) return noEncontrado("Expediente no encontrado");
      return { status: 200 as const, body: dto };
    },
    designarJurado: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "crear"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new DesignarJuradoUseCase().execute(
        params.id,
        {
          dni: body.dni,
          nombres: body.nombres,
          apellidos: body.apellidos,
          rol: body.rol,
          ...(body.grado !== undefined ? { grado: body.grado } : {}),
          ...(body.instancia !== undefined ? { instancia: body.instancia } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      const j = (await dtoCierre(params.id))?.jurados.find((x) => x.id === r.value.id);
      if (!j) return noEncontrado("Designación no encontrada");
      return { status: 201 as const, body: j };
    },
    dictaminar: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "editar"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new DictaminarUseCase().execute(
        params.id,
        params.juradoId,
        {
          dictamen: body.dictamen,
          ...(body.comentario !== undefined ? { comentario: body.comentario } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      const j = (await dtoCierre(params.id))?.jurados.find((x) => x.id === r.value.id);
      if (!j) return noEncontrado("Designación no encontrada");
      return { status: 200 as const, body: j };
    },
    programarSustentacion: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "crear"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new ProgramarSustentacionUseCase().execute(
        params.id,
        { fecha: body.fecha, hora: body.hora, lugar: body.lugar, modalidad: body.modalidad },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      const dto = await dtoCierre(params.id);
      if (!dto?.sustentacion) return noEncontrado("Sustentación no encontrada");
      return { status: 200 as const, body: dto.sustentacion };
    },
    proponerFechas: async ({ params, body, request }) => {
      // El tesista desde su portal (alcance RN-06) o el área en su nombre.
      const a = await autorizar(request.actor, {
        permiso: ["portal_alumno", "crear"],
        alternativas: [["sustentacion", "crear"]],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new ProponerFechasSustentacionUseCase().execute(
        params.id,
        {
          desde: body.desde,
          hasta: body.hasta,
          ...(body.comentario !== undefined ? { comentario: body.comentario } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      const dto = await dtoCierre(params.id);
      if (!dto?.propuesta) return noEncontrado("Propuesta no encontrada");
      return { status: 201 as const, body: dto.propuesta };
    },
    registrarActa: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["sustentacion", "aprobar"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new RegistrarActaUseCase().execute(params.id, body.veredicto, actor);
      if (!r.ok) return respuestaError(r.error);
      const dto = await dtoCierre(params.id);
      if (!dto?.sustentacion) return noEncontrado("Sustentación no encontrada");
      return { status: 200 as const, body: dto.sustentacion };
    },
    registrarValidacion: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, {
        permiso: ["validaciones", "aprobar"],
        expedienteId: params.id,
      });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new RegistrarValidacionUseCase().execute(
        params.id,
        {
          instancia: body.instancia,
          estado: body.estado,
          ...(body.porcentaje !== undefined ? { porcentaje: body.porcentaje } : {}),
          ...(body.detalle !== undefined ? { detalle: body.detalle } : {}),
        },
        actor,
      );
      if (!r.ok) return respuestaError(r.error);
      const v = (await dtoCierre(params.id))?.validaciones.find((x) => x.id === r.value.id);
      if (!v) return noEncontrado("Validación no encontrada");
      return { status: 200 as const, body: v };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
