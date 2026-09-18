import type { Db } from "@pis/db";
import {
  auditoriaTransiciones,
  documentos,
  expedientes,
  mensajes,
  subetapas,
  usuarios,
} from "@pis/db";
import { CHECKLIST_COMPLETO, etapaActualDe, FLUJO_TITULACION, TOTAL_SUBETAPAS } from "@pis/domain";
import { asc, eq } from "drizzle-orm";

export type EstadoLiteral =
  | "REGISTRADO"
  | "EN_PLAN"
  | "PLAN_APROBADO"
  | "EN_BORRADOR"
  | "EN_DICTAMEN"
  | "APTO_SUSTENTACION"
  | "SUSTENTADO"
  | "EN_VALIDACION"
  | "EN_APROBACION"
  | "TITULO_EMITIDO"
  | "OBSERVADO"
  | "DESAPROBADO_TRUNCO"
  | "ANULADO";

type PersonaRow = {
  id: string;
  dni: string;
  cui: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  nacionalidad: string | null;
  ciudad: string | null;
  direccion: string | null;
  grado: string | null;
  activo: boolean;
  rol: string;
};

export interface DetalleRow {
  id: string;
  codigo: string;
  estado: EstadoLiteral;
  modalidad: "TESIS" | "TRABAJO_ACADEMICO" | "ARTICULO";
  programa: string;
  titulo: string;
  updatedAt: string;
  participante1: PersonaRow | null;
  participante2: PersonaRow | null;
  asesor: PersonaRow | null;
  datosAdmin: Record<string, string | null>;
  checklist: Array<{
    tipo: string;
    nombre: string;
    etapa: "E1" | "E2";
    obligatorio: boolean;
    estado: "PENDIENTE" | "CARGADO" | "OBSERVADO" | "APROBADO" | "RECHAZADO";
    documentoId: string | null;
    version: number | null;
    updatedAt: string | null;
    faltantes: string[];
  }>;
  subetapas: Array<{
    etapa: number;
    etapaNombre: string;
    orden: number;
    nombre: string;
    plazo: string | null;
    estado: "NO_INICIADO" | "EN_CURSO" | "FINALIZADO";
    responsable: string | null;
    inicio: string | null;
    fin: string | null;
  }>;
  avance: {
    marcados: number;
    total: number;
    pct: number;
    etapaActual: number;
    subetapaActual: string | null;
  };
  mensajes: Array<{ id: string; texto: string; autorDni: string | null; createdAt: string }>;
  historial: Array<{
    estadoAnterior: string | null;
    estadoNuevo: string;
    actorDni: string | null;
    createdAt: string;
  }>;
}

const CAMPOS_ADMIN = [
  "modalidad02",
  "modalidadFinal",
  "titulo02",
  "asesorNombre",
  "nroDecreto",
  "recomendacion",
  "presidente",
  "secretario",
  "coAsesor",
  "fechaApertura",
  "fechaPresentacion",
  "nroOficio",
  "integrante",
  "presidenteE2",
  "secretarioE2",
  "suplenteE2",
  "decanal",
  "fechaSustentacion",
  "horaSustentacion",
  "lugarSustentacion",
  "modalidadVirtual",
] as const;

function toPersona(u: typeof usuarios.$inferSelect): PersonaRow {
  return {
    id: u.id,
    dni: u.dni,
    cui: u.cui,
    nombres: u.nombres,
    apellidos: u.apellidos,
    email: u.email,
    telefono: u.telefono,
    nacionalidad: u.nacionalidad,
    ciudad: u.ciudad,
    direccion: u.direccion,
    grado: u.grado,
    activo: u.activo,
    rol: u.rol,
  };
}

export function avanceDe(
  subs: Array<{ estado: string; etapa: number; orden: number; nombre: string }>,
  estadoMacro: string,
): DetalleRow["avance"] {
  const marcados = subs.filter((s) => s.estado === "FINALIZADO").length;
  const actual =
    subs.find((s) => s.estado === "EN_CURSO") ?? subs.find((s) => s.estado === "NO_INICIADO");
  return {
    marcados,
    total: TOTAL_SUBETAPAS,
    pct: Math.round((marcados / TOTAL_SUBETAPAS) * 100),
    etapaActual: etapaActualDe(estadoMacro),
    subetapaActual: actual ? `${actual.etapa}.${actual.orden} ${actual.nombre}` : null,
  };
}

/** Lectura del detalle: expediente + personas + checklist + seguimiento + mensajes + historial. */
export async function getDetalleById(db: Db, id: string): Promise<DetalleRow | null> {
  const exp = await db.select().from(expedientes).where(eq(expedientes.id, id)).limit(1);
  const row = exp[0];
  if (!row) return null;

  const personas = await db.select().from(usuarios);
  const porId = new Map(personas.map((p) => [p.id, toPersona(p)]));

  const docs = await db.select().from(documentos).where(eq(documentos.expedienteId, id));
  const porTipo = new Map<string, typeof documentos.$inferSelect>();
  for (const d of docs) {
    const prev = porTipo.get(d.tipo);
    if (!prev || d.version > prev.version) porTipo.set(d.tipo, d);
  }

  const checklist = CHECKLIST_COMPLETO.map((def) => {
    const doc = porTipo.get(def.tipo);
    return {
      tipo: def.tipo,
      nombre: def.nombre,
      etapa: def.etapa,
      obligatorio: def.obligatorio,
      estado: doc?.estado ?? ("PENDIENTE" as const),
      documentoId: doc?.id ?? null,
      version: doc?.version ?? null,
      updatedAt: doc?.createdAt ? doc.createdAt.toISOString() : null,
      faltantes: doc ? [] : ["Falta adjuntar el archivo"],
    };
  });

  const subs = await db
    .select()
    .from(subetapas)
    .where(eq(subetapas.expedienteId, id))
    .orderBy(asc(subetapas.etapa), asc(subetapas.orden));

  const msgs = await db
    .select()
    .from(mensajes)
    .where(eq(mensajes.expedienteId, id))
    .orderBy(asc(mensajes.createdAt));

  const hist = await db
    .select({
      estadoAnterior: auditoriaTransiciones.estadoAnterior,
      estadoNuevo: auditoriaTransiciones.estadoNuevo,
      actorId: auditoriaTransiciones.actorId,
      createdAt: auditoriaTransiciones.createdAt,
    })
    .from(auditoriaTransiciones)
    .where(eq(auditoriaTransiciones.expedienteId, id))
    .orderBy(asc(auditoriaTransiciones.createdAt));

  const datosAdmin: Record<string, string | null> = {};
  for (const k of CAMPOS_ADMIN) {
    const v: unknown = row[k];
    datosAdmin[k] =
      v instanceof Date ? v.toISOString().slice(0, 10) : ((v as string | null) ?? null);
  }

  return {
    id: row.id,
    codigo: row.codigo,
    estado: row.estado as EstadoLiteral,
    modalidad: row.modalidad as DetalleRow["modalidad"],
    programa: row.programa,
    titulo: row.titulo,
    updatedAt: row.updatedAt.toISOString(),
    participante1: row.participante1Id ? (porId.get(row.participante1Id) ?? null) : null,
    participante2: row.participante2Id ? (porId.get(row.participante2Id) ?? null) : null,
    asesor: row.asesorId ? (porId.get(row.asesorId) ?? null) : null,
    datosAdmin,
    checklist,
    subetapas: subs.map((s) => ({
      etapa: s.etapa,
      etapaNombre: FLUJO_TITULACION.find((e) => e.numero === s.etapa)?.nombre ?? `Etapa ${s.etapa}`,
      orden: s.orden,
      nombre: s.nombre,
      plazo: s.plazo,
      estado: s.estado,
      responsable: s.responsable,
      inicio: s.inicio ? s.inicio.toISOString() : null,
      fin: s.fin ? s.fin.toISOString() : null,
    })),
    avance: avanceDe(
      subs.map((s) => ({ estado: s.estado, etapa: s.etapa, orden: s.orden, nombre: s.nombre })),
      row.estado,
    ),
    mensajes: msgs.map((m) => ({
      id: m.id,
      texto: m.texto,
      autorDni: m.autorId ? (porId.get(m.autorId)?.dni ?? null) : null,
      createdAt: m.createdAt.toISOString(),
    })),
    historial: hist.map((h) => ({
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      actorDni: h.actorId ? (porId.get(h.actorId)?.dni ?? null) : null,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}

export interface ResumenRow {
  id: string;
  codigo: string;
  tesista: string;
  dni: string;
  programa: string;
  etapaActual: number;
  subetapaActual: string | null;
  estado: EstadoLiteral;
  avancePct: number;
  updatedAt: string;
}

/** Dashboard §4: tabla con filtros + indicadores agregados (una sola lectura). */
export async function listarExpedientes(
  db: Db,
  filtros: {
    q?: string | undefined;
    estado?: string | undefined;
    orden?: string | undefined;
    vista?: string | undefined;
    actorDni?: string | undefined;
    actorRol?: string | undefined;
  },
): Promise<{
  items: ResumenRow[];
  resumen: { total: number; enCurso: number; finalizados: number; sinIniciar: number };
}> {
  const exps = await db.select().from(expedientes).orderBy(asc(expedientes.codigo));
  const personas = await db.select().from(usuarios);
  const porId = new Map(personas.map((p) => [p.id, p]));
  const todasSubs = await db.select().from(subetapas);

  let items: Array<ResumenRow & { p2dni: string | null; asesorDni: string | null }> = exps.map(
    (row) => {
      const p1 = row.participante1Id ? porId.get(row.participante1Id) : undefined;
      const subs = todasSubs
        .filter((s) => s.expedienteId === row.id)
        .map((s) => ({ estado: s.estado, etapa: s.etapa, orden: s.orden, nombre: s.nombre }));
      const av = avanceDe(subs, row.estado);
      return {
        id: row.id,
        codigo: row.codigo,
        tesista: p1 ? `${p1.nombres} ${p1.apellidos}` : "—",
        dni: p1?.dni ?? "—",
        programa: row.programa,
        etapaActual: av.etapaActual,
        subetapaActual: av.subetapaActual,
        estado: row.estado as EstadoLiteral,
        avancePct: av.pct,
        updatedAt: row.updatedAt.toISOString(),
        p2dni: row.participante2Id ? (porId.get(row.participante2Id)?.dni ?? null) : null,
        asesorDni: row.asesorId ? (porId.get(row.asesorId)?.dni ?? null) : null,
      };
    },
  );

  // vista=mis: el actor solo ve lo suyo (permissions-matrix RN-06/RN-07).
  if (filtros.vista === "mis" && filtros.actorDni) {
    const dni = filtros.actorDni;
    if (filtros.actorRol === "TESISTA") {
      items = items.filter((i) => i.dni === dni || i.p2dni === dni);
    } else if (filtros.actorRol === "ASESOR" || filtros.actorRol === "JURADO") {
      items = items.filter((i) => i.asesorDni === dni);
    }
  }

  const q = (filtros.q ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter((i) =>
      [i.codigo, i.tesista, i.dni, i.programa].some((v) => v.toLowerCase().includes(q)),
    );
  }
  if (filtros.estado) items = items.filter((i) => i.estado === filtros.estado);
  switch (filtros.orden ?? "recientes") {
    case "antiguos":
      items.sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1));
      break;
    case "menor-avance":
      items.sort((a, b) => a.avancePct - b.avancePct);
      break;
    case "mayor-avance":
      items.sort((a, b) => b.avancePct - a.avancePct);
      break;
    default:
      items.sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }

  const es = (e: string): "curso" | "fin" | "sin" =>
    e === "TITULO_EMITIDO" ? "fin" : e === "REGISTRADO" ? "sin" : "curso";
  return {
    items,
    resumen: {
      total: exps.length,
      enCurso: exps.filter((e) => es(e.estado) === "curso").length,
      finalizados: exps.filter((e) => es(e.estado) === "fin").length,
      sinIniciar: exps.filter((e) => es(e.estado) === "sin").length,
    },
  };
}
