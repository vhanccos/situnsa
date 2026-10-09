import {
  cronogramaPensiones,
  type DbExecutor,
  expedientes,
  grupoMiembros,
  gruposTaller,
  tallerAsistencias,
  talleres,
  tallerSesiones,
  usuarios,
} from "@pis/db";
import { porcentajeAsistencia } from "@pis/domain";
import { desc, eq } from "drizzle-orm";

/** CSV "6,7" ↔ number[] (días ISO). */
export function diasCsvADias(csv: string | null): number[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((x) => Number.isInteger(x) && x >= 1 && x <= 7);
}

export function diasADiasCsv(dias: number[]): string {
  return [...new Set(dias)].sort((a, b) => a - b).join(",");
}

export interface GrupoResumen {
  id: string;
  nombre: string;
  asesorNombre: string | null;
  miembros: number;
}

export interface TallerDetalle {
  id: string;
  nombre: string;
  asesorNombre: string | null;
  asesorDni: string | null;
  periodo: string | null;
  estado: "ACTIVO" | "CERRADO" | "CANCELADO";
  inscritos: number;
  cupoMax: number | null;
  fechaInicio: string | null;
  diasSesion: number[];
  horaInicio: string | null;
  horaFin: string | null;
  enlace: string | null;
  sesiones: { realizadas: number; total: number };
  grupos: GrupoResumen[];
}

/** P1/P3: taller con conteos y grupos (lectura en una transacción o directa). */
export async function detalleTaller(
  db: DbExecutor,
  tallerId: string,
): Promise<TallerDetalle | null> {
  const filas = await db.select().from(talleres).where(eq(talleres.id, tallerId)).limit(1);
  const t = filas[0];
  if (!t) return null;
  const gente = await db
    .select({
      id: usuarios.id,
      dni: usuarios.dni,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u]));
  const asesor = t.asesorId ? (porId.get(t.asesorId) ?? null) : null;
  const sesiones = await db
    .select({ estado: tallerSesiones.estado })
    .from(tallerSesiones)
    .where(eq(tallerSesiones.tallerId, tallerId));
  const grupos = await db.select().from(gruposTaller).where(eq(gruposTaller.tallerId, tallerId));
  const membresias = grupos.length > 0 ? await db.select().from(grupoMiembros) : [];
  const resumen: GrupoResumen[] = grupos.map((g) => {
    const ga = g.asesorId ? (porId.get(g.asesorId) ?? null) : null;
    return {
      id: g.id,
      nombre: g.nombre,
      asesorNombre: ga ? `${ga.nombres} ${ga.apellidos}` : null,
      miembros: membresias.filter((m) => m.grupoId === g.id).length,
    };
  });
  return {
    id: t.id,
    nombre: t.nombre,
    asesorNombre: asesor ? `${asesor.nombres} ${asesor.apellidos}` : null,
    asesorDni: asesor?.dni ?? null,
    periodo: t.periodo,
    estado: t.estado,
    inscritos: t.inscritos,
    cupoMax: t.cupoMax,
    fechaInicio: t.fechaInicio,
    diasSesion: diasCsvADias(t.diasSesion),
    horaInicio: t.horaInicio,
    horaFin: t.horaFin,
    enlace: t.enlace,
    sesiones: {
      realizadas: sesiones.filter((s) => s.estado === "REALIZADA").length,
      total: sesiones.length,
    },
    grupos: resumen,
  };
}

export interface AlumnoTaller {
  usuarioDni: string;
  nombres: string;
  grupoId: string;
  grupoNombre: string;
  asistenciaPct: number;
  pagosEstado: "AL_DIA" | "CON_DEUDA" | "SIN_CUOTAS";
  pagosVencidas: number;
  expediente: string | null;
}

function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/** P3/P5 tabla de alumnos: grupo, % asistencia, pagos y expediente SET. */
export async function alumnosDelTaller(db: DbExecutor, tallerId: string): Promise<AlumnoTaller[]> {
  const grupos = await db.select().from(gruposTaller).where(eq(gruposTaller.tallerId, tallerId));
  if (grupos.length === 0) return [];
  const porGrupo = new Map(grupos.map((g) => [g.id, g]));
  const membresias = await db.select().from(grupoMiembros);
  const mias = membresias.filter((m) => porGrupo.has(m.grupoId));
  const gente = await db.select().from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u]));
  const sesiones = await db
    .select()
    .from(tallerSesiones)
    .where(eq(tallerSesiones.tallerId, tallerId));
  const marcas = sesiones.length > 0 ? await db.select().from(tallerAsistencias) : [];
  const marcaPor = new Map(marcas.map((m) => [`${m.sesionId}|${m.usuarioId}`, m.estado]));
  const cuotas = await db.select().from(cronogramaPensiones);
  const exps = await db.select().from(expedientes).orderBy(desc(expedientes.createdAt));
  const hoy = hoyLima();
  const vistos = new Set<string>();
  const out: AlumnoTaller[] = [];
  for (const m of mias) {
    if (vistos.has(m.usuarioId)) continue;
    vistos.add(m.usuarioId);
    const u = porId.get(m.usuarioId);
    if (!u) continue;
    const g = porGrupo.get(m.grupoId);
    const registros = sesiones.map((s) => ({
      sesion: s.estado as "PROGRAMADA" | "ABIERTA" | "REALIZADA" | "CANCELADA",
      marca: (marcaPor.get(`${s.id}|${m.usuarioId}`) ?? null) as
        | "PENDIENTE"
        | "PRESENTE"
        | "FALTA"
        | "JUSTIFICADA"
        | null,
    }));
    const miasCuotas = cuotas.filter((c) => c.usuarioId === m.usuarioId);
    const vencidas = miasCuotas.filter(
      (c) => (c.estado === "PENDIENTE" || c.estado === "OBSERVADO") && c.vencimiento < hoy,
    ).length;
    const exp = exps.find(
      (e) =>
        (e.participante1Id === m.usuarioId || e.participante2Id === m.usuarioId) &&
        e.estado !== "ANULADO",
    );
    out.push({
      usuarioDni: u.dni,
      nombres: `${u.nombres} ${u.apellidos}`,
      grupoId: m.grupoId,
      grupoNombre: g?.nombre ?? "—",
      asistenciaPct: porcentajeAsistencia(registros),
      pagosEstado: miasCuotas.length === 0 ? "SIN_CUOTAS" : vencidas > 0 ? "CON_DEUDA" : "AL_DIA",
      pagosVencidas: vencidas,
      expediente: exp?.codigo ?? null,
    });
  }
  return out;
}
