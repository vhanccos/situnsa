import {
  cronogramaPensiones,
  type DbExecutor,
  db,
  tallerAsistencias,
  tallerAvances,
  tallerCumplimiento,
  tallerEntregas,
  tallerFases,
  tallerPases,
  tallerSesiones,
  usuarios,
} from "@pis/db";
import { DomainError, evaluarPase, fail, ok, porcentajeAsistencia, type Result } from "@pis/domain";
import { and, desc, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import type { AlmacenamientoPort } from "../../../infra/storage/almacenamiento.port.js";
import { LocalStorageService } from "../../../infra/storage/local-storage.service.js";
import { miembrosDelTaller, tallerPorId, usuarioEnTaller } from "../taller-alcance.js";
import { appendAuditoriaTaller } from "../taller-auditoria.js";
import {
  type AvanceDTO,
  avancesDelTaller,
  type FaseDTO,
  type FilaMatriz,
  matrizFases,
  ultimoPase,
} from "../taller-avances.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** P6 Agregar fase (el asesor define nombre, descripción y fecha orientativa). */
export class CrearFaseUseCase {
  async execute(
    tallerId: string,
    input: { nombre: string; descripcion?: string; fechaRef?: string },
    actor: Actor,
  ): Promise<Result<FaseDTO, DomainError>> {
    const nombre = input.nombre.trim();
    if (nombre.length < 3)
      return fail(new DomainError("VALIDACION_FALLIDA", "El nombre debe tener al menos 3 letras"));
    if (input.fechaRef !== undefined && !FECHA_RE.test(input.fechaRef))
      return fail(new DomainError("VALIDACION_FALLIDA", "Fecha inválida (usa AAAA-MM-DD)"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const t = await tallerPorId(tx, tallerId);
      if (!t) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      const previas = await tx
        .select({ orden: tallerFases.orden })
        .from(tallerFases)
        .where(eq(tallerFases.tallerId, tallerId))
        .orderBy(desc(tallerFases.orden))
        .limit(1);
      const orden = (previas[0]?.orden ?? 0) + 1;
      const inserted = await tx
        .insert(tallerFases)
        .values({
          tallerId,
          nombre,
          descripcion: input.descripcion?.trim() || null,
          fechaRef: input.fechaRef ?? null,
          orden,
        })
        .returning();
      const f = inserted[0];
      if (!f) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo crear la fase"));
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CREAR_FASE",
        detalle: `Fase «${nombre}»`,
      });
      return ok({
        id: f.id,
        tallerId: f.tallerId,
        nombre: f.nombre,
        descripcion: f.descripcion,
        fechaRef: f.fechaRef,
        orden: f.orden,
      });
    });
  }
}

export interface MarcarInput {
  usuarioDni: string;
  estado: "PENDIENTE" | "CUMPLIDA" | "OBSERVADA";
  comentario?: string;
}

/** P6 Marcar cumplimiento por alumno (observada exige comentario). */
export class MarcarCumplimientoUseCase {
  async execute(
    faseId: string,
    input: MarcarInput,
    actor: Actor,
  ): Promise<Result<FilaMatriz, DomainError>> {
    if (input.estado === "OBSERVADA" && (input.comentario ?? "").trim().length === 0)
      return fail(
        new DomainError("VALIDACION_FALLIDA", "La fase observada necesita un comentario"),
      );
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const fases = await tx.select().from(tallerFases).where(eq(tallerFases.id, faseId)).limit(1);
      const fase = fases[0];
      if (!fase) return fail(new DomainError("NO_ENCONTRADO", "Fase no encontrada"));
      const gente = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.dni, input.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      const grupoId = await usuarioEnTaller(tx, fase.tallerId, u.id);
      if (!grupoId)
        return fail(new DomainError("FUERA_DE_ALCANCE", "El alumno no pertenece a este taller"));
      await tx
        .insert(tallerCumplimiento)
        .values({
          faseId,
          usuarioId: u.id,
          estado: input.estado,
          comentario: input.comentario?.trim() || null,
        })
        .onConflictDoUpdate({
          target: [tallerCumplimiento.faseId, tallerCumplimiento.usuarioId],
          set: { estado: input.estado, comentario: input.comentario?.trim() || null },
        });
      await appendAuditoriaTaller(tx, {
        tallerId: fase.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "MARCAR_CUMPLIMIENTO",
        detalle: `Fase ${faseId}, DNI ${input.usuarioDni} → ${input.estado}`,
      });
      const { matriz } = await matrizFases(tx, fase.tallerId, [{ usuarioId: u.id }]);
      const fila = matriz[0];
      if (!fila) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      return ok(fila);
    });
  }
}

/** P6 Solicitar avance (sesión, descripción y plazo) + aviso al alumno. */
export class SolicitarAvanceUseCase {
  async execute(
    tallerId: string,
    input: { sesionId?: string; descripcion: string; plazo: string },
    actor: Actor,
  ): Promise<Result<{ avance: AvanceDTO; correos: string[] }, DomainError>> {
    if (!FECHA_RE.test(input.plazo))
      return fail(new DomainError("VALIDACION_FALLIDA", "Plazo inválido (usa AAAA-MM-DD)"));
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const t = await tallerPorId(tx, tallerId);
      if (!t) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      if (input.sesionId) {
        const ss = await tx
          .select({ tallerId: tallerSesiones.tallerId })
          .from(tallerSesiones)
          .where(eq(tallerSesiones.id, input.sesionId))
          .limit(1);
        if (!ss[0] || ss[0].tallerId !== tallerId)
          return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada en el taller"));
      }
      const inserted = await tx
        .insert(tallerAvances)
        .values({
          tallerId,
          sesionId: input.sesionId ?? null,
          descripcion: input.descripcion.trim(),
          plazo: input.plazo,
          solicitadoPor: actor.id,
        })
        .returning();
      const a = inserted[0];
      if (!a) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo solicitar el avance"));
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "SOLICITAR_AVANCE",
        detalle: `Plazo ${input.plazo}: ${input.descripcion.trim().slice(0, 120)}`,
      });
      const miembros = await miembrosDelTaller(tx, tallerId);
      const gente = await tx.select({ id: usuarios.id, email: usuarios.email }).from(usuarios);
      const porId = new Map(gente.map((u) => [u.id, u.email]));
      const correos = [...new Set(miembros.map((m) => m.usuarioId))]
        .map((id) => porId.get(id))
        .filter((e): e is string => !!e);
      const avances = await avancesDelTaller(tx, tallerId);
      const avance = avances.find((x) => x.id === a.id);
      if (!avance) return fail(new DomainError("NO_ENCONTRADO", "Avance no encontrado"));
      return ok({ avance, correos });
    });
    if (!r.ok) return r;
    if (r.value.correos.length > 0) {
      await enqueueCorreo({
        para: r.value.correos,
        asunto: "Te solicitaron un avance del taller",
        titulo: "Nuevo avance solicitado",
        texto: `Plazo ${r.value.avance.plazo}. Súbelo desde Mi Taller antes del vencimiento.`,
      });
    }
    return ok({ avance: r.value.avance, correos: r.value.correos });
  }
}

const MAX_AVANCE_BYTES = 10 * 1024 * 1024;
const CABECERA_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const CABECERA_ZIP = [0x50, 0x4b, 0x03, 0x04] as const;
const CABECERA_OLE = [0xd0, 0xcf, 0x11, 0xe0] as const;

function extensionValida(nombre: string): boolean {
  return /\.(pdf|doc|docx)$/i.test(nombre);
}

function cabeceraValida(bytes: Uint8Array): boolean {
  const es = (cab: readonly number[]) => cab.every((b, i) => bytes[i] === b);
  return es(CABECERA_PDF) || es(CABECERA_ZIP) || es(CABECERA_OLE);
}

export interface SubirEntregaInput {
  avanceId: string;
  usuarioId: string;
  filename: string;
  bytes: Uint8Array;
}

/** P7 Subir avance: PDF o Word, versiones anteriores conservadas. */
export class SubirEntregaUseCase {
  constructor(private readonly storage: AlmacenamientoPort = new LocalStorageService()) {}

  async execute(
    input: SubirEntregaInput,
    actor: Actor,
  ): Promise<Result<{ id: string; version: number }, DomainError>> {
    if (!extensionValida(input.filename))
      return fail(
        new DomainError("DOCUMENTO_INVALIDO", "Solo se aceptan PDF y Word (.pdf, .doc, .docx)"),
      );
    if (input.bytes.length === 0 || input.bytes.length > MAX_AVANCE_BYTES)
      return fail(new DomainError("DOCUMENTO_INVALIDO", "El archivo debe pesar entre 1B y 10MB"));
    if (!cabeceraValida(input.bytes))
      return fail(new DomainError("DOCUMENTO_INVALIDO", "El archivo no es un PDF o Word válido"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const avances = await tx
        .select()
        .from(tallerAvances)
        .where(eq(tallerAvances.id, input.avanceId))
        .limit(1);
      const avance = avances[0];
      if (!avance) return fail(new DomainError("NO_ENCONTRADO", "Avance no encontrado"));
      const t = await tallerPorId(tx, avance.tallerId);
      if (!t || t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      const grupoId = await usuarioEnTaller(tx, avance.tallerId, input.usuarioId);
      if (!grupoId) return fail(new DomainError("FUERA_DE_ALCANCE", "No perteneces a este taller"));
      const previas = await tx
        .select({ version: tallerEntregas.version })
        .from(tallerEntregas)
        .where(
          and(
            eq(tallerEntregas.avanceId, input.avanceId),
            eq(tallerEntregas.usuarioId, input.usuarioId),
          ),
        )
        .orderBy(desc(tallerEntregas.version))
        .limit(1);
      const version = (previas[0]?.version ?? 0) + 1;
      const ext = input.filename.split(".").pop()?.toLowerCase() ?? "pdf";
      const { ruta, sha256 } = await this.storage.save(
        avance.tallerId,
        `avance_${input.avanceId}_v${version}.${ext}`,
        input.bytes,
        "avances",
      );
      const inserted = await tx
        .insert(tallerEntregas)
        .values({
          avanceId: input.avanceId,
          usuarioId: input.usuarioId,
          ruta,
          sha256,
          nombreOriginal: input.filename.slice(0, 255),
          version,
        })
        .returning({ id: tallerEntregas.id });
      const e = inserted[0];
      if (!e) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar la entrega"));
      await appendAuditoriaTaller(tx, {
        tallerId: avance.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "SUBIR_AVANCE",
        detalle: `Avance ${input.avanceId} v${version} (sha256 ${sha256.slice(0, 12)}…)`,
      });
      return ok({ id: e.id, version });
    });
  }
}

export interface RevisarInput {
  usuarioDni: string;
  estado: "CONFORME" | "OBSERVADO";
  observacion?: string;
}

/** P6 Revisar entrega (solo la última versión; el historial queda). */
export class RevisarEntregaUseCase {
  async execute(
    avanceId: string,
    input: RevisarInput,
    actor: Actor,
  ): Promise<Result<{ email: string | null }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const avances = await tx
        .select()
        .from(tallerAvances)
        .where(eq(tallerAvances.id, avanceId))
        .limit(1);
      const avance = avances[0];
      if (!avance) return fail(new DomainError("NO_ENCONTRADO", "Avance no encontrado"));
      const gente = await tx
        .select({ id: usuarios.id, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.dni, input.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      const ultimas = await tx
        .select()
        .from(tallerEntregas)
        .where(and(eq(tallerEntregas.avanceId, avanceId), eq(tallerEntregas.usuarioId, u.id)))
        .orderBy(desc(tallerEntregas.version))
        .limit(1);
      const ultima = ultimas[0];
      if (!ultima)
        return fail(new DomainError("VALIDACION_FALLIDA", "El alumno aún no entrega este avance"));
      // Contrato (spec: "Conforme u Observado") ↔ columna (la entrega, en femenino).
      const estadoDb =
        input.estado === "OBSERVADO" ? ("OBSERVADA" as const) : ("CONFORME" as const);
      await tx
        .update(tallerEntregas)
        .set({ estado: estadoDb, observacion: input.observacion?.trim() || null })
        .where(eq(tallerEntregas.id, ultima.id));
      await appendAuditoriaTaller(tx, {
        tallerId: avance.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "REVISAR_ENTREGA",
        detalle: `Avance ${avanceId}, DNI ${input.usuarioDni} → ${input.estado}`,
      });
      return ok({ email: u.email });
    });
    if (!r.ok) return r;
    if (input.estado === "OBSERVADO") {
      await enqueueCorreo({
        para: [r.value.email],
        asunto: "Observaron tu avance del taller",
        titulo: "Avance observado",
        texto: `Motivo: ${input.observacion?.trim() || "revisa el detalle"}. Sube una versión corregida desde Mi Taller.`,
      });
    }
    return ok({ email: r.value.email });
  }
}

function hoyLima(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

export interface PaseFila {
  usuarioDni: string;
  nombres: string;
  fasesCompletas: boolean;
  validacionAsesor: boolean;
  asistenciaPct: number;
  cuotasAlDia: boolean | null;
  elegible: boolean;
  faltantes: string[];
  avisos: string[];
  pase: { validadoPor: string; validadoDni: string; createdAt: string } | null;
}

/** P6 condiciones por alumno (elegibilidad + qué falta, RNF-04). */
export async function filasPase(db: DbExecutor, tallerId: string): Promise<PaseFila[]> {
  const miembros = await miembrosDelTaller(db, tallerId);
  const ids = [...new Set(miembros.map((m) => m.usuarioId))];
  const { matriz } = await matrizFases(
    db,
    tallerId,
    ids.map((usuarioId) => ({ usuarioId })),
  );
  const porDni = new Map(matriz.map((f) => [f.usuarioDni, f]));
  const gente = await db.select().from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u]));
  const sesiones = await db
    .select({ id: tallerSesiones.id, estado: tallerSesiones.estado })
    .from(tallerSesiones)
    .where(eq(tallerSesiones.tallerId, tallerId));
  const marcas = sesiones.length > 0 ? await db.select().from(tallerAsistencias) : [];
  const marcaPor = new Map(marcas.map((m) => [`${m.sesionId}|${m.usuarioId}`, m.estado]));
  const estadoPorSesion = new Map(sesiones.map((s) => [s.id, s.estado]));
  const cuotas = await db.select().from(cronogramaPensiones);
  const hoy = hoyLima();
  const out: PaseFila[] = [];
  for (const id of ids) {
    const u = porId.get(id);
    if (!u) continue;
    const fila = porDni.get(u.dni);
    const registros = sesiones.map((s) => ({
      sesion: estadoPorSesion.get(s.id) as "PROGRAMADA" | "ABIERTA" | "REALIZADA" | "CANCELADA",
      marca: (marcaPor.get(`${s.id}|${id}`) ?? null) as
        | "PENDIENTE"
        | "PRESENTE"
        | "FALTA"
        | "JUSTIFICADA"
        | null,
    }));
    const asistenciaPct = porcentajeAsistencia(registros);
    const mias = cuotas.filter((c) => c.usuarioId === id);
    const cuotasAlDia =
      mias.length === 0
        ? null
        : !mias.some(
            (c) =>
              (c.estado === "PENDIENTE" ||
                c.estado === "OBSERVADO" ||
                c.estado === "EN_REVISION") &&
              c.vencimiento < hoy,
          );
    const pase = await ultimoPase(db, tallerId, id);
    const ev = evaluarPase({
      fasesCompletas: fila?.fasesCompletas ?? false,
      validacionAsesor: pase !== null,
      asistenciaPct,
      cuotasAlDia,
    });
    out.push({
      usuarioDni: u.dni,
      nombres: `${u.nombres} ${u.apellidos}`,
      fasesCompletas: fila?.fasesCompletas ?? false,
      validacionAsesor: pase !== null,
      asistenciaPct,
      cuotasAlDia,
      elegible: ev.elegible,
      faltantes: ev.faltantes,
      avisos: ev.avisos,
      pase,
    });
  }
  return out;
}

/** P6 Validar y pasar a Plan: exige fases completas; notifica al alumno. */
export class ValidarPaseUseCase {
  async execute(
    tallerId: string,
    input: { usuarioDni: string },
    actor: Actor,
  ): Promise<Result<{ email: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const t = await tallerPorId(tx, tallerId);
      if (!t) return fail(new DomainError("NO_ENCONTRADO", "Taller no encontrado"));
      if (t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      const gente = await tx
        .select({ id: usuarios.id, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.dni, input.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      const grupoId = await usuarioEnTaller(tx, tallerId, u.id);
      if (!grupoId)
        return fail(new DomainError("FUERA_DE_ALCANCE", "El alumno no pertenece a este taller"));
      const filas = await filasPase(tx, tallerId);
      const fila = filas.find((f) => f.usuarioDni === input.usuarioDni);
      if (!fila?.fasesCompletas)
        return fail(
          new DomainError(
            "REQUISITO_PENDIENTE",
            `Faltan fases por completar: ${(fila?.faltantes ?? []).join("; ") || "sin fases"}`,
          ),
        );
      const previo = await ultimoPase(tx, tallerId, u.id);
      if (!previo) {
        await tx.insert(tallerPases).values({ tallerId, usuarioId: u.id, validadoPor: actor.id });
        await appendAuditoriaTaller(tx, {
          tallerId,
          actorId: actor.id,
          actorDni: actor.dni,
          accion: "VALIDAR_PASE",
          detalle: `DNI ${input.usuarioDni} pasa a Plan de tesis`,
        });
      }
      return ok({ email: u.email });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      para: [r.value.email],
      asunto: "Pasaste a Plan de tesis",
      titulo: "Validación del taller completa",
      texto:
        "Tu asesor validó tu pase a Plan de tesis. Continúa tu trámite en el flujo de expedientes.",
    });
    return ok({ email: r.value.email });
  }
}

/** P6 Revertir pase: solo administrador, con motivo (propuesta del spec). */
export class RevertirPaseUseCase {
  async execute(
    tallerId: string,
    input: { usuarioDni: string; motivo: string },
    actor: Actor,
    esAdmin: boolean,
  ): Promise<Result<{ id: string }, DomainError>> {
    if (!esAdmin)
      return fail(new DomainError("PERMISO_DENEGADO", "Solo el administrador revierte un pase"));
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const gente = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.dni, input.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      const rows = await tx
        .select({ id: tallerPases.id })
        .from(tallerPases)
        .where(and(eq(tallerPases.tallerId, tallerId), eq(tallerPases.usuarioId, u.id)))
        .limit(1);
      const p = rows[0];
      if (!p) return fail(new DomainError("NO_ENCONTRADO", "El alumno no tiene pase vigente"));
      await tx.delete(tallerPases).where(eq(tallerPases.id, p.id));
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "REVERTIR_PASE",
        detalle: `DNI ${input.usuarioDni}. Motivo: ${input.motivo.trim()}`,
      });
      return ok({ id: p.id });
    });
  }
}
