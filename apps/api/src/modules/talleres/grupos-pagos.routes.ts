import { type CuotaDTO, gruposContract, reportesContract } from "@pis/contracts";
import { cronogramaPensiones, db, grupoMiembros, gruposTaller, talleres, usuarios } from "@pis/db";
import { initServer } from "@ts-rest/fastify";
import { and, eq, inArray, lt } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { autorizar, denegado, esPersonal } from "../../infra/auth/autorizacion.js";
import { errorEnvelope } from "../../infra/http/errores.js";
import { OPCIONES_TS_REST } from "../../infra/http/manejador-errores.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { usuarioEnTaller } from "./taller-alcance.js";
import { alcanceTaller, errorUso } from "./taller-http.js";
import {
  ObservarComprobanteUseCase,
  ValidarComprobanteUseCase,
} from "./use-cases/comprobantes.use-cases.js";
import {
  AgregarMiembroUseCase,
  CrearGrupoUseCase,
  ProgramarPensionesUseCase,
  RegistrarPagoUseCase,
} from "./use-cases/grupos-pagos.use-cases.js";

const s = initServer();

/** Cuotas no cerradas (pendientes de pago o revisión). */
const CUOTAS_ABIERTAS = ["PENDIENTE", "EN_REVISION", "OBSERVADO"] as const;

function dtoCuota(
  c: typeof cronogramaPensiones.$inferSelect,
  u: { dni: string; nombres: string; apellidos: string } | undefined,
): CuotaDTO {
  return {
    id: c.id,
    usuarioDni: u?.dni ?? "—",
    nombres: u ? `${u.nombres} ${u.apellidos}` : "—",
    nroCuota: c.nroCuota,
    monto: c.monto,
    vencimiento: c.vencimiento,
    estado: c.estado,
    tieneComprobante: c.comprobanteRuta !== null,
    motivo: c.motivo,
    comprobanteFecha: c.comprobanteFecha?.toISOString() ?? null,
  };
}

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
      and(
        eq(cronogramaPensiones.grupoId, grupoId),
        inArray(cronogramaPensiones.estado, [...CUOTAS_ABIERTAS]),
      ),
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

/** Grupos, pensiones y pagos del taller (Oleada C + P8/P9 comprobantes). */
export function registerGruposRoutes(app: FastifyInstance): void {
  const router = s.router(gruposContract, {
    listar: async ({ request }) => {
      const a = await autorizar(request.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) return denegado(a);
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
      if (!a.ok) return denegado(a);
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
      if (!r.ok) {
        if (r.error.code === "NO_ENCONTRADO")
          return { status: 404 as const, body: errorEnvelope(r.error.code, r.error.message) };
        return { status: 400 as const, body: errorEnvelope(r.error.code, r.error.message) };
      }
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
      if (!a.ok) return denegado(a);
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
      if (!a.ok) return denegado(a);
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
        body: { items: cuotas.map((c) => dtoCuota(c, porId.get(c.usuarioId))) },
      };
    },
    programarPensiones: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "crear"] });
      if (!a.ok) return denegado(a);
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
      if (!a.ok) return denegado(a);
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
    misCuotas: async ({ query, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "ver"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "" };
      // Fase A: el personal puede ver las de un alumno indicado.
      let usuarioId = actor.id;
      if (query.usuarioDni !== undefined) {
        if (!esPersonal(a.perfil.roles))
          return {
            status: 403 as const,
            body: errorEnvelope("SIN_PERMISO", "Se requiere personal"),
          };
        const gente = await db
          .select()
          .from(usuarios)
          .where(eq(usuarios.dni, query.usuarioDni))
          .limit(1);
        if (!gente[0])
          return {
            status: 404 as const,
            body: errorEnvelope("NO_ENCONTRADO", "Alumno no encontrado"),
          };
        usuarioId = gente[0].id;
      }
      const al = await alcanceTaller(query.tallerId, { id: usuarioId, dni: "" }, a.perfil);
      if (!al.ok) return al;
      const esMiembro = await usuarioEnTaller(db, query.tallerId, usuarioId);
      if (!esMiembro && !esPersonal(a.perfil.roles))
        return {
          status: 403 as const,
          body: errorEnvelope("FUERA_DE_ALCANCE", "No perteneces a este taller"),
        };
      const grupos = await db
        .select({ id: gruposTaller.id })
        .from(gruposTaller)
        .where(eq(gruposTaller.tallerId, query.tallerId));
      if (grupos.length === 0) return { status: 200 as const, body: { items: [] } };
      const cuotas = await db
        .select()
        .from(cronogramaPensiones)
        .where(
          and(
            inArray(
              cronogramaPensiones.grupoId,
              grupos.map((g) => g.id),
            ),
            eq(cronogramaPensiones.usuarioId, usuarioId),
          ),
        );
      const gente = await db.select().from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u]));
      const items = cuotas.map((c) => dtoCuota(c, porId.get(c.usuarioId)));
      items.sort((x, y) => x.nroCuota - y.nroCuota);
      return { status: 200 as const, body: { items } };
    },
    validarComprobante: async ({ params, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new ValidarComprobanteUseCase().execute(params.id, actor);
      if (!r.ok) return errorUso(r.error);
      const filas = await db
        .select()
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.id, params.id))
        .limit(1);
      const c = filas[0];
      if (!c)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Cuota no encontrada"),
        };
      const gente = await db.select().from(usuarios);
      return {
        status: 200 as const,
        body: dtoCuota(
          c,
          gente.find((u) => u.id === c.usuarioId),
        ),
      };
    },
    observarComprobante: async ({ params, body, request }) => {
      const a = await autorizar(request.actor, { permiso: ["pagos", "editar"] });
      if (!a.ok) return denegado(a);
      const actor = request.actor ?? { id: "", dni: "desconocido" };
      const r = await new ObservarComprobanteUseCase().execute(
        params.id,
        { motivo: body.motivo },
        actor,
      );
      if (!r.ok) return errorUso(r.error);
      const filas = await db
        .select()
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.id, params.id))
        .limit(1);
      const c = filas[0];
      if (!c)
        return {
          status: 404 as const,
          body: errorEnvelope("NO_ENCONTRADO", "Cuota no encontrada"),
        };
      const gente = await db.select().from(usuarios);
      return {
        status: 200 as const,
        body: dtoCuota(
          c,
          gente.find((u) => u.id === c.usuarioId),
        ),
      };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}

/** P9 Deudores (HU-0015): cuotas abiertas vencidas, filtrable por taller y período. */
export function registerReportesRoutes(app: FastifyInstance): void {
  const router = s.router(reportesContract, {
    deudores: async ({ query, request }) => {
      const a = await autorizar(request.actor, { permiso: ["reportes", "ver"] });
      if (!a.ok) return denegado(a);
      // Fecha civil de Arequipa: en UTC, desde las 19:00 ya sería "mañana".
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
      const vencidas = await db
        .select()
        .from(cronogramaPensiones)
        .where(
          and(
            inArray(cronogramaPensiones.estado, ["PENDIENTE", "OBSERVADO"]),
            lt(cronogramaPensiones.vencimiento, hoy),
          ),
        );
      const gente = await db.select().from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u]));
      const grupos = await db.select().from(gruposTaller);
      const porGrupo = new Map(grupos.map((g) => [g.id, g]));
      const talls = await db.select().from(talleres);
      const porTaller = new Map(talls.map((t) => [t.id, t]));
      const agg = new Map<
        string,
        {
          usuarioId: string;
          dni: string;
          nombres: string;
          grupoId: string;
          grupoNombre: string;
          tallerId: string;
          tallerNombre: string;
          periodo: string | null;
          cuotasVencidas: number;
          deudaTotal: number;
          cuotas: Array<{ nroCuota: number; monto: number; vencimiento: string }>;
        }
      >();
      for (const c of vencidas) {
        const u = porId.get(c.usuarioId);
        const g = porGrupo.get(c.grupoId);
        const t = g ? porTaller.get(g.tallerId) : undefined;
        if (!u || !g || !t) continue;
        if (query.tallerId && t.id !== query.tallerId) continue;
        if (query.periodo && t.periodo !== query.periodo) continue;
        const key = `${c.usuarioId}|${c.grupoId}`;
        const prev = agg.get(key) ?? {
          usuarioId: c.usuarioId,
          dni: u.dni,
          nombres: `${u.nombres} ${u.apellidos}`,
          grupoId: c.grupoId,
          grupoNombre: g.nombre,
          tallerId: t.id,
          tallerNombre: t.nombre,
          periodo: t.periodo,
          cuotasVencidas: 0,
          deudaTotal: 0,
          cuotas: [],
        };
        prev.cuotasVencidas += 1;
        prev.deudaTotal += c.monto;
        prev.cuotas.push({ nroCuota: c.nroCuota, monto: c.monto, vencimiento: c.vencimiento });
        agg.set(key, prev);
      }
      return { status: 200 as const, body: { items: [...agg.values()] } };
    },
  });
  void app.register(async (scoped) => {
    scoped.addHook("preHandler", requireAuth);
    await scoped.register(s.plugin(router), OPCIONES_TS_REST);
  });
}
