import { gruposContract, reportesContract } from "@pis/contracts";
import { cronogramaPensiones, db, grupoMiembros, gruposTaller, talleres, usuarios } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { and, eq, lt } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import {
  AgregarMiembroUseCase,
  CrearGrupoUseCase,
  ProgramarPensionesUseCase,
  RegistrarPagoUseCase,
} from "./use-cases/grupos-pagos.use-cases.js";

const s = initServer();

async function dtoGrupo(grupoId: string) {
  const g = await db.select().from(gruposTaller).where(eq(gruposTaller.id, grupoId)).limit(1);
  const row = g[0];
  if (!row) return null;
  const t = await db.select().from(talleres).where(eq(talleres.id, row.tallerId)).limit(1);
  const gente = await db.select().from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, `${u.nombres} ${u.apellidos}`]));
  const miembros = await db.select().from(grupoMiembros).where(eq(grupoMiembros.grupoId, grupoId));
  const cuotas = await db
    .select()
    .from(cronogramaPensiones)
    .where(
      and(eq(cronogramaPensiones.grupoId, grupoId), eq(cronogramaPensiones.estado, "PENDIENTE")),
    );
  return {
    id: row.id,
    tallerId: row.tallerId,
    tallerNombre: t[0]?.nombre ?? "—",
    nombre: row.nombre,
    asesorNombre: row.asesorId ? (porId.get(row.asesorId) ?? null) : null,
    estado: row.estado,
    miembros: miembros.length,
    cuotasPendientes: cuotas.length,
  };
}

/** Grupos, pensiones y pagos del taller (Oleada C). */
export function registerGruposRoutes(app: FastifyInstance): void {
  const router = s.router(gruposContract, {
    listar: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const grupos = await db.select().from(gruposTaller);
      const items: Array<NonNullable<Awaited<ReturnType<typeof dtoGrupo>>>> = [];
      for (const g of grupos) {
        const dto = await dtoGrupo(g.id);
        if (dto) items.push(dto);
      }
      return { status: 200 as const, body: { items } };
    },
    crear: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "crear"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new CrearGrupoUseCase();
      const r = await uc.execute(
        {
          tallerId: body.tallerId,
          nombre: body.nombre,
          ...(body.asesorDni !== undefined ? { asesorDni: body.asesorDni } : {}),
        },
        actor,
      );
      if (!r.ok)
        return {
          status: (r.error.code === "NO_ENCONTRADO" ? 404 : 400) as 400,
          body: errorEnvelope(r.error.code, r.error.message),
        };
      const dto = await dtoGrupo(r.value.id);
      if (!dto)
        return {
          status: 400 as const,
          body: errorEnvelope("VALIDACION_FALLIDA", "No se pudo crear el grupo"),
        };
      return { status: 201 as const, body: dto };
    },
    agregarMiembro: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "editar"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new AgregarMiembroUseCase();
      const r = await uc.execute(params.id, body.usuarioDni, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 201 as const, body: r.value };
    },
    listarCuotas: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const g = await db
        .select({ id: gruposTaller.id })
        .from(gruposTaller)
        .where(eq(gruposTaller.id, params.id))
        .limit(1);
      if (!g[0])
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Grupo no encontrado"),
        };
      const cuotas = await db
        .select()
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.grupoId, params.id));
      const gente = await db.select().from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u]));
      return {
        status: 200 as const,
        body: {
          items: cuotas.map((c) => {
            const u = porId.get(c.usuarioId);
            return {
              id: c.id,
              usuarioDni: u?.dni ?? "—",
              nombres: u ? `${u.nombres} ${u.apellidos}` : "—",
              nroCuota: c.nroCuota,
              monto: c.monto,
              vencimiento: c.vencimiento,
              estado: c.estado,
            };
          }),
        },
      };
    },
    programarPensiones: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "crear"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new ProgramarPensionesUseCase();
      const r = await uc.execute(params.id, body, actor);
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 201 as const, body: r.value };
    },
    registrarPago: async ({ body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "crear"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const uc = new RegistrarPagoUseCase();
      const r = await uc.execute(
        {
          cronogramaId: body.cronogramaId,
          monto: body.monto,
          medio: body.medio ?? "CAJA",
          ...(body.referencia !== undefined ? { referencia: body.referencia } : {}),
        },
        actor,
      );
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
      return { status: 201 as const, body: r.value };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}

/** Reporte de deudores (HU-0015): cuotas PENDIENTE vencidas, agregadas por tesista+grupo. */
export function registerReportesRoutes(app: FastifyInstance): void {
  const router = s.router(reportesContract, {
    deudores: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["reportes", "ver"] });
      if (!a.ok) {
        if (a.status === 401) return { status: 401 as const, body: a.body };
        return { status: 403 as const, body: a.body };
      }
      const hoy = new Date().toISOString().slice(0, 10);
      const vencidas = await db
        .select()
        .from(cronogramaPensiones)
        .where(
          and(
            eq(cronogramaPensiones.estado, "PENDIENTE"),
            lt(cronogramaPensiones.vencimiento, hoy),
          ),
        );
      const gente = await db.select().from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u]));
      const grupos = await db.select().from(gruposTaller);
      const porGrupo = new Map(grupos.map((g) => [g.id, g.nombre]));
      const agg = new Map<
        string,
        {
          usuarioId: string;
          dni: string;
          nombres: string;
          grupoId: string;
          grupoNombre: string;
          cuotasVencidas: number;
          deudaTotal: number;
        }
      >();
      for (const c of vencidas) {
        const u = porId.get(c.usuarioId);
        if (!u) continue;
        const key = `${c.usuarioId}|${c.grupoId}`;
        const prev = agg.get(key) ?? {
          usuarioId: c.usuarioId,
          dni: u.dni,
          nombres: `${u.nombres} ${u.apellidos}`,
          grupoId: c.grupoId,
          grupoNombre: porGrupo.get(c.grupoId) ?? "—",
          cuotasVencidas: 0,
          deudaTotal: 0,
        };
        prev.cuotasVencidas += 1;
        prev.deudaTotal += c.monto;
        agg.set(key, prev);
      }
      return { status: 200 as const, body: { items: [...agg.values()] } };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    scoped.register(s.plugin(router));
  });
}
