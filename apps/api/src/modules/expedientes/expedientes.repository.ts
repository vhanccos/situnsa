import type { Db } from "@pis/db";
import { auditoriaTransiciones, documentos, expedientes, usuarios } from "@pis/db";
import { CHECKLIST_COMPLETO } from "@pis/domain";
import { asc, eq } from "drizzle-orm";

export interface PersonaRow {
  id: string;
  dni: string;
  cui: string | null;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  rol: string;
}

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
  historial: Array<{
    estadoAnterior: string | null;
    estadoNuevo: string;
    actorDni: string | null;
    createdAt: string;
  }>;
}

function toPersona(u: typeof usuarios.$inferSelect): PersonaRow {
  return {
    id: u.id,
    dni: u.dni,
    cui: u.cui,
    nombres: u.nombres,
    apellidos: u.apellidos,
    email: u.email,
    telefono: u.telefono,
    rol: u.rol,
  };
}

/** Lectura del detalle: expediente + personas + checklist + historial. */
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
    checklist,
    historial: hist.map((h) => ({
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      actorDni: h.actorId ? (porId.get(h.actorId)?.dni ?? null) : null,
      createdAt: h.createdAt.toISOString(),
    })),
  };
}
