import {
  type DbExecutor,
  tallerAvances,
  tallerCumplimiento,
  tallerEntregas,
  tallerFases,
  tallerPases,
  tallerSesiones,
  usuarios,
} from "@pis/db";
import { and, desc, eq } from "drizzle-orm";

export interface FaseDTO {
  id: string;
  tallerId: string;
  nombre: string;
  descripcion: string | null;
  fechaRef: string | null;
  orden: number;
}

export interface FilaMatriz {
  usuarioDni: string;
  nombres: string;
  celdas: Array<{
    faseId: string;
    estado: "PENDIENTE" | "CUMPLIDA" | "OBSERVADA";
    comentario: string | null;
  }>;
  fasesCompletas: boolean;
}

export async function fasesDelTaller(db: DbExecutor, tallerId: string): Promise<FaseDTO[]> {
  return db
    .select()
    .from(tallerFases)
    .where(eq(tallerFases.tallerId, tallerId))
    .orderBy(tallerFases.orden);
}

/** P6 matriz alumno × fase (cumplimiento por alumno, decisión Q3). */
export async function matrizFases(
  db: DbExecutor,
  tallerId: string,
  miembros: Array<{ usuarioId: string }>,
): Promise<{ fases: FaseDTO[]; matriz: FilaMatriz[] }> {
  const fases = await fasesDelTaller(db, tallerId);
  if (fases.length === 0 || miembros.length === 0) return { fases, matriz: [] };
  const gente = await db
    .select({
      id: usuarios.id,
      dni: usuarios.dni,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u]));
  const faseIds = new Set(fases.map((f) => f.id));
  const marcas = (await db.select().from(tallerCumplimiento)).filter((c) => faseIds.has(c.faseId));
  const porCelda = new Map(marcas.map((c) => [`${c.faseId}|${c.usuarioId}`, c]));
  const matriz: FilaMatriz[] = [];
  for (const m of miembros) {
    const u = porId.get(m.usuarioId);
    if (!u) continue;
    const celdas: FilaMatriz["celdas"] = fases.map((f) => {
      const celda = porCelda.get(`${f.id}|${m.usuarioId}`);
      return {
        faseId: f.id,
        estado: celda?.estado ?? "PENDIENTE",
        comentario: celda?.comentario ?? null,
      };
    });
    matriz.push({
      usuarioDni: u.dni,
      nombres: `${u.nombres} ${u.apellidos}`,
      celdas,
      fasesCompletas: celdas.length > 0 && celdas.every((c) => c.estado === "CUMPLIDA"),
    });
  }
  return { fases, matriz };
}

export interface EntregaDTO {
  id: string;
  usuarioDni: string;
  nombres: string;
  version: number;
  estado: "ENTREGADA" | "CONFORME" | "OBSERVADA";
  observacion: string | null;
  createdAt: string;
}

export interface AvanceDTO {
  id: string;
  tallerId: string;
  sesionNro: number | null;
  descripcion: string;
  plazo: string;
  entregas: EntregaDTO[];
}

/** P6/P7 avances con última entrega por alumno (el historial queda en DB). */
export async function avancesDelTaller(
  db: DbExecutor,
  tallerId: string,
  soloUsuarioId?: string,
): Promise<AvanceDTO[]> {
  const avances = await db
    .select()
    .from(tallerAvances)
    .where(eq(tallerAvances.tallerId, tallerId))
    .orderBy(desc(tallerAvances.createdAt));
  const sesiones = await db
    .select()
    .from(tallerSesiones)
    .where(eq(tallerSesiones.tallerId, tallerId));
  const nroPorSesion = new Map(sesiones.map((s) => [s.id, s.nro]));
  const gente = await db
    .select({
      id: usuarios.id,
      dni: usuarios.dni,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u]));
  const out: AvanceDTO[] = [];
  for (const a of avances) {
    const todas = await db
      .select()
      .from(tallerEntregas)
      .where(eq(tallerEntregas.avanceId, a.id))
      .orderBy(desc(tallerEntregas.version));
    const ultimas = new Map<string, (typeof todas)[number]>();
    for (const e of todas) {
      if (soloUsuarioId && e.usuarioId !== soloUsuarioId) continue;
      if (!ultimas.has(e.usuarioId)) ultimas.set(e.usuarioId, e);
    }
    out.push({
      id: a.id,
      tallerId: a.tallerId,
      sesionNro: a.sesionId ? (nroPorSesion.get(a.sesionId) ?? null) : null,
      descripcion: a.descripcion,
      plazo: a.plazo,
      entregas: [...ultimas.values()].map((e) => {
        const u = porId.get(e.usuarioId);
        return {
          id: e.id,
          usuarioDni: u?.dni ?? "—",
          nombres: u ? `${u.nombres} ${u.apellidos}` : "—",
          version: e.version,
          estado: e.estado,
          observacion: e.observacion,
          createdAt: e.createdAt.toISOString(),
        };
      }),
    });
  }
  return out;
}

export async function ultimoPase(
  db: DbExecutor,
  tallerId: string,
  usuarioId: string,
): Promise<{ validadoPor: string; validadoDni: string; createdAt: string } | null> {
  const rows = await db
    .select()
    .from(tallerPases)
    .where(and(eq(tallerPases.tallerId, tallerId), eq(tallerPases.usuarioId, usuarioId)))
    .limit(1);
  const p = rows[0];
  if (!p) return null;
  const gente = await db
    .select({
      id: usuarios.id,
      dni: usuarios.dni,
      nombres: usuarios.nombres,
      apellidos: usuarios.apellidos,
    })
    .from(usuarios);
  const v = gente.find((u) => u.id === p.validadoPor);
  return {
    validadoPor: v ? `${v.nombres} ${v.apellidos}` : "—",
    validadoDni: v?.dni ?? "—",
    createdAt: p.createdAt.toISOString(),
  };
}
