import {
  cronogramaPensiones,
  type DbExecutor,
  db,
  grupoMiembros,
  gruposTaller,
  tallerAsistencias,
  talleres,
  tallerSesiones,
  usuarios,
} from "@pis/db";
import {
  DomainError,
  fail,
  marcasAlCerrar,
  ok,
  puedeAbrirAsistencia,
  type Result,
} from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import {
  alumnoValidadoPorDni,
  cronogramaDelGrupo,
  miembrosDelTaller,
  sesionesDelTaller,
  tallerActivoDe,
  tallerPorId,
  usuarioEnTaller,
} from "../taller-alcance.js";
import { appendAuditoriaTaller } from "../taller-auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

async function sesionPorId(tx: DbExecutor, sesionId: string) {
  const rows = await tx
    .select({
      id: tallerSesiones.id,
      tallerId: tallerSesiones.tallerId,
      estado: tallerSesiones.estado,
    })
    .from(tallerSesiones)
    .where(eq(tallerSesiones.id, sesionId))
    .limit(1);
  return rows[0] ?? null;
}

async function correosMiembros(tx: DbExecutor, tallerId: string): Promise<string[]> {
  const miembros = await miembrosDelTaller(tx, tallerId);
  if (miembros.length === 0) return [];
  const ids = [...new Set(miembros.map((m) => m.usuarioId))];
  const gente = await tx.select({ id: usuarios.id, email: usuarios.email }).from(usuarios);
  const porId = new Map(gente.map((u) => [u.id, u.email]));
  return ids.map((id) => porId.get(id)).filter((e): e is string => !!e);
}

/** P4 Abrir: solo asesor (permiso en ruta), programada, taller activo, una a la vez. */
export class AbrirAsistenciaUseCase {
  async execute(sesionId: string, actor: Actor): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      const t = await tallerPorId(tx, s.tallerId);
      if (!t || t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      if (s.estado !== "PROGRAMADA")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo una sesión programada abre asistencia"),
        );
      const sesiones = await sesionesDelTaller(tx, s.tallerId);
      if (!puedeAbrirAsistencia(sesiones.filter((x) => x.estado === "ABIERTA").length))
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Ya hay una sesión con asistencia abierta"),
        );
      await tx
        .update(tallerSesiones)
        .set({ estado: "ABIERTA" })
        .where(eq(tallerSesiones.id, sesionId));
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "ABRIR_ASISTENCIA",
        detalle: `Sesión ${sesionId}`,
      });
      return ok({ id: sesionId });
    });
  }
}

/** P4 Cerrar: pendientes → FALTA (dominio), sesión REALIZADA. */
export class CerrarAsistenciaUseCase {
  async execute(sesionId: string, actor: Actor): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      if (s.estado !== "ABIERTA")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo una sesión abierta se puede cerrar"),
        );
      const marcas = await tx
        .select({ usuarioId: tallerAsistencias.usuarioId, estado: tallerAsistencias.estado })
        .from(tallerAsistencias)
        .where(eq(tallerAsistencias.sesionId, sesionId));
      const cierre = marcasAlCerrar(marcas.map((m) => m.estado));
      for (let i = 0; i < marcas.length; i++) {
        const m = marcas[i];
        const final = cierre[i];
        if (!m || !final || m.estado === final) continue;
        await tx
          .update(tallerAsistencias)
          .set({ estado: final })
          .where(
            and(
              eq(tallerAsistencias.sesionId, sesionId),
              eq(tallerAsistencias.usuarioId, m.usuarioId),
            ),
          );
      }
      await tx
        .update(tallerSesiones)
        .set({ estado: "REALIZADA" })
        .where(eq(tallerSesiones.id, sesionId));
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CERRAR_ASISTENCIA",
        detalle: `Sesión ${sesionId}: pendientes → FALTA`,
      });
      return ok({ id: sesionId });
    });
  }
}

export interface ReprogramarInput {
  fecha: string;
  horaInicio?: string;
  horaFin?: string;
  motivo: string;
}

/** P4 Reprogramar: solo esa sesión; asistencias marcadas se conservan. */
export class ReprogramarSesionUseCase {
  async execute(
    sesionId: string,
    input: ReprogramarInput,
    actor: Actor,
  ): Promise<Result<{ id: string; correos: string[] }, DomainError>> {
    const horaInicio = input.horaInicio;
    const horaFin = input.horaFin;
    if (horaInicio !== undefined && horaFin !== undefined && horaFin <= horaInicio)
      return fail(
        new DomainError("VALIDACION_FALLIDA", "La hora de fin debe ser posterior a la de inicio"),
      );
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      if (s.estado !== "PROGRAMADA" && s.estado !== "ABIERTA")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo una sesión pendiente se reprograma"),
        );
      await tx
        .update(tallerSesiones)
        .set({
          fecha: input.fecha,
          ...(horaInicio !== undefined ? { horaInicio } : {}),
          ...(horaFin !== undefined ? { horaFin } : {}),
          motivo: input.motivo.trim(),
        })
        .where(eq(tallerSesiones.id, sesionId));
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "REPROGRAMAR_SESION",
        detalle: `Sesión ${sesionId} → ${input.fecha}. Motivo: ${input.motivo.trim()}`,
      });
      const correos = await correosMiembros(tx, s.tallerId);
      return ok({ id: sesionId, tallerId: s.tallerId, correos });
    });
    if (!r.ok) return r;
    if (r.value.correos.length > 0) {
      await enqueueCorreo({
        para: r.value.correos,
        asunto: "Tu sesión de taller se reprogramó",
        titulo: "Sesión reprogramada",
        texto: "Revisa Mi Taller para ver la nueva fecha y hora.",
      });
    }
    return ok({ id: r.value.id, correos: r.value.correos });
  }
}

/** P4 Cancelar sesión: no admite asistencia y no cuenta para el porcentaje. */
export class CancelarSesionUseCase {
  async execute(
    sesionId: string,
    input: { motivo: string },
    actor: Actor,
  ): Promise<Result<{ id: string; correos: string[] }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      if (s.estado !== "PROGRAMADA" && s.estado !== "ABIERTA")
        return fail(new DomainError("TRANSICION_INVALIDA", "Solo una sesión pendiente se cancela"));
      await tx
        .update(tallerSesiones)
        .set({ estado: "CANCELADA", motivo: input.motivo.trim() })
        .where(eq(tallerSesiones.id, sesionId));
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CANCELAR_SESION",
        detalle: `Sesión ${sesionId}. Motivo: ${input.motivo.trim()}`,
      });
      const correos = await correosMiembros(tx, s.tallerId);
      return ok({ id: sesionId, correos });
    });
    if (!r.ok) return r;
    if (r.value.correos.length > 0) {
      await enqueueCorreo({
        para: r.value.correos,
        asunto: "Se canceló una sesión de tu taller",
        titulo: "Sesión cancelada",
        texto: "Revisa Mi Taller para ver el estado de tus sesiones.",
      });
    }
    return ok({ id: r.value.id, correos: r.value.correos });
  }
}

/** P7 Marcar: ventana abierta, miembro del taller, una sola vez. */
export class MarcarAsistenciaUseCase {
  async execute(
    sesionId: string,
    usuarioId: string,
    actor: Actor,
  ): Promise<Result<{ estado: "PRESENTE"; marcadaAt: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      const t = await tallerPorId(tx, s.tallerId);
      if (!t || t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      if (s.estado !== "ABIERTA")
        return fail(
          new DomainError(
            "TRANSICION_INVALIDA",
            "La asistencia de esta sesión aún no está abierta",
          ),
        );
      const grupoId = await usuarioEnTaller(tx, s.tallerId, usuarioId);
      if (!grupoId) return fail(new DomainError("FUERA_DE_ALCANCE", "No perteneces a este taller"));
      const filas = await tx
        .select({ estado: tallerAsistencias.estado })
        .from(tallerAsistencias)
        .where(
          and(eq(tallerAsistencias.sesionId, sesionId), eq(tallerAsistencias.usuarioId, usuarioId)),
        )
        .limit(1);
      const actual = filas[0]?.estado;
      if (!actual)
        return fail(new DomainError("NO_ENCONTRADO", "No estás registrado en la sesión"));
      if (actual !== "PENDIENTE")
        return fail(new DomainError("TRANSICION_INVALIDA", "Ya marcaste tu asistencia"));
      const marcadaAt = new Date();
      await tx
        .update(tallerAsistencias)
        .set({ estado: "PRESENTE", marcadaAt })
        .where(
          and(eq(tallerAsistencias.sesionId, sesionId), eq(tallerAsistencias.usuarioId, usuarioId)),
        );
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "MARCAR_ASISTENCIA",
        detalle: `Sesión ${sesionId}`,
      });
      return ok({ estado: "PRESENTE", marcadaAt: marcadaAt.toISOString() });
    });
  }
}

export interface CorregirInput {
  usuarioDni: string;
  estado: "PRESENTE" | "FALTA" | "JUSTIFICADA";
  motivo: string;
}

/** P4 Corregir/justificar: motivo obligatorio, queda en historial, hora intacta. */
export class CorregirAsistenciaUseCase {
  async execute(
    sesionId: string,
    input: CorregirInput,
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const s = await sesionPorId(tx, sesionId);
      if (!s) return fail(new DomainError("NO_ENCONTRADO", "Sesión no encontrada"));
      const gente = await tx
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(eq(usuarios.dni, input.usuarioDni))
        .limit(1);
      const u = gente[0];
      if (!u) return fail(new DomainError("NO_ENCONTRADO", "Alumno no encontrado"));
      const grupoId = await usuarioEnTaller(tx, s.tallerId, u.id);
      if (!grupoId)
        return fail(new DomainError("FUERA_DE_ALCANCE", "El alumno no pertenece a este taller"));
      const filas = await tx
        .select({ estado: tallerAsistencias.estado })
        .from(tallerAsistencias)
        .where(and(eq(tallerAsistencias.sesionId, sesionId), eq(tallerAsistencias.usuarioId, u.id)))
        .limit(1);
      if (!filas[0])
        return fail(new DomainError("NO_ENCONTRADO", "Sin registro de asistencia en la sesión"));
      await tx
        .update(tallerAsistencias)
        .set({ estado: input.estado, motivo: input.motivo.trim(), actualizadaPor: actor.id })
        .where(
          and(eq(tallerAsistencias.sesionId, sesionId), eq(tallerAsistencias.usuarioId, u.id)),
        );
      await appendAuditoriaTaller(tx, {
        tallerId: s.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "CORREGIR_ASISTENCIA",
        detalle: `Sesión ${sesionId}, DNI ${input.usuarioDni} → ${input.estado}. Motivo: ${input.motivo.trim()}`,
      });
      return ok({ id: sesionId });
    });
  }
}

/**
 * P3 Asignar alumno (DNI + grupo): inscripción validada + cupo + un taller
 * activo → miembro + asistencias PENDIENTE + cuotas del cronograma + aviso.
 */
export class AsignarAlumnoUseCase {
  async execute(
    grupoId: string,
    usuarioDni: string,
    actor: Actor,
  ): Promise<Result<{ grupoId: string; usuarioId: string }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const grupos = await tx
        .select({ id: gruposTaller.id, tallerId: gruposTaller.tallerId })
        .from(gruposTaller)
        .where(eq(gruposTaller.id, grupoId))
        .limit(1);
      const g = grupos[0];
      if (!g) return fail(new DomainError("NO_ENCONTRADO", "Grupo no encontrado"));
      const t = await tallerPorId(tx, g.tallerId);
      if (!t || t.estado !== "ACTIVO")
        return fail(new DomainError("TRANSICION_INVALIDA", "El taller ya no está activo"));
      const alumno = await alumnoValidadoPorDni(tx, usuarioDni);
      if (!alumno)
        return fail(
          new DomainError(
            "VALIDACION_FALLIDA",
            `El DNI ${usuarioDni} no tiene inscripción validada y no se puede asignar`,
          ),
        );
      const otro = await tallerActivoDe(tx, alumno.id);
      if (otro && otro !== g.tallerId)
        return fail(
          new DomainError("VALIDACION_FALLIDA", "El alumno ya está en otro taller activo"),
        );
      const ya = await usuarioEnTaller(tx, g.tallerId, alumno.id);
      if (ya)
        return fail(new DomainError("VALIDACION_FALLIDA", "El alumno ya está en este taller"));
      const miembros = await miembrosDelTaller(tx, g.tallerId);
      const distintos = new Set(miembros.map((m) => m.usuarioId));
      if (t.cupoMax !== null && distintos.size + 1 > t.cupoMax)
        return fail(new DomainError("VALIDACION_FALLIDA", "El cupo del taller está lleno"));
      await tx.insert(grupoMiembros).values({ grupoId, usuarioId: alumno.id });
      const sesiones = await sesionesDelTaller(tx, g.tallerId);
      if (sesiones.length > 0) {
        await tx
          .insert(tallerAsistencias)
          .values(sesiones.map((s) => ({ sesionId: s.id, usuarioId: alumno.id })));
      }
      const cronograma = await cronogramaDelGrupo(tx, grupoId);
      if (cronograma.length > 0) {
        await tx.insert(cronogramaPensiones).values(
          cronograma.map((c) => ({
            grupoId,
            usuarioId: alumno.id,
            nroCuota: c.nroCuota,
            monto: c.monto,
            vencimiento: c.vencimiento,
            estado: "PENDIENTE" as const,
          })),
        );
      }
      await tx
        .update(talleres)
        .set({ inscritos: distintos.size + 1 })
        .where(eq(talleres.id, g.tallerId));
      await appendAuditoriaTaller(tx, {
        tallerId: g.tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "ASIGNAR_ALUMNO",
        detalle: `DNI ${usuarioDni} al grupo ${grupoId}`,
      });
      return ok({ grupoId, usuarioId: alumno.id, email: alumno.email, tallerId: g.tallerId });
    });
    if (!r.ok) return r;
    await enqueueCorreo({
      para: [r.value.email],
      asunto: "Fuiste asignado a un taller de tesis",
      titulo: "Ya eres parte del taller",
      texto: "Desde Mi Taller verás tus sesiones y enlace; desde Mis Pagos, tus cuotas.",
    });
    return ok({ grupoId: r.value.grupoId, usuarioId: r.value.usuarioId });
  }
}
