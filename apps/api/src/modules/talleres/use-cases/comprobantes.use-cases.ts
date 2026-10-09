import {
  cronogramaPensiones,
  type DbExecutor,
  db,
  gruposTaller,
  pagosTaller,
  roles,
  usuarios,
  usuariosRoles,
} from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { eq, inArray } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../infra/jobs/colas.js";
import type { AlmacenamientoPort } from "../../../infra/storage/almacenamiento.port.js";
import { LocalStorageService } from "../../../infra/storage/local-storage.service.js";
import { usuarioEnTaller } from "../taller-alcance.js";
import { appendAuditoriaTaller } from "../taller-auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

const MAX_COMPROBANTE_BYTES = 5 * 1024 * 1024; // P8: imagen o PDF, hasta 5 MB
const CABECERA_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;
const CABECERA_PNG = [0x89, 0x50, 0x4e, 0x47] as const;
const CABECERA_JPG = [0xff, 0xd8, 0xff] as const;

function extensionValida(nombre: string): boolean {
  return /\.(pdf|png|jpg|jpeg)$/i.test(nombre);
}

function cabeceraValida(bytes: Uint8Array): boolean {
  const es = (cab: readonly number[]) => cab.every((b, i) => bytes[i] === b);
  return es(CABECERA_PDF) || es(CABECERA_PNG) || es(CABECERA_JPG);
}

/** Secretaría a avisar (spec §6): roles operativos del área con correo. */
export async function correosSecretaria(db: DbExecutor): Promise<string[]> {
  const filas = await db
    .select({ usuarioId: usuariosRoles.usuarioId, email: usuarios.email })
    .from(usuariosRoles)
    .innerJoin(roles, eq(roles.id, usuariosRoles.rolId))
    .innerJoin(usuarios, eq(usuarios.id, usuariosRoles.usuarioId))
    .where(inArray(roles.nombre, ["RESP_TITULACION", "RESP_TALLER"]));
  return [...new Set(filas.map((f) => f.email))];
}

async function cuotaConTaller(tx: DbExecutor, cuotaId: string) {
  const rows = await tx
    .select()
    .from(cronogramaPensiones)
    .where(eq(cronogramaPensiones.id, cuotaId))
    .limit(1);
  const c = rows[0];
  if (!c) return null;
  const gs = await tx
    .select({ tallerId: gruposTaller.tallerId })
    .from(gruposTaller)
    .where(eq(gruposTaller.id, c.grupoId))
    .limit(1);
  const tallerId = gs[0]?.tallerId ?? null;
  if (!tallerId) return null;
  return { cuota: c, tallerId };
}

export interface SubirComprobanteInput {
  cuotaId: string;
  usuarioId: string;
  filename: string;
  bytes: Uint8Array;
}

/** P8 Subir comprobante: la cuota pasa a EN_REVISIÓN y se avisa a Secretaría. */
export class SubirComprobanteUseCase {
  constructor(private readonly storage: AlmacenamientoPort = new LocalStorageService()) {}

  async execute(
    input: SubirComprobanteInput,
    actor: Actor,
  ): Promise<Result<{ id: string }, DomainError>> {
    if (!extensionValida(input.filename))
      return fail(
        new DomainError("DOCUMENTO_INVALIDO", "Solo se aceptan imagen o PDF (.png, .jpg, .pdf)"),
      );
    if (input.bytes.length === 0 || input.bytes.length > MAX_COMPROBANTE_BYTES)
      return fail(new DomainError("DOCUMENTO_INVALIDO", "El archivo debe pesar entre 1B y 5MB"));
    if (!cabeceraValida(input.bytes))
      return fail(
        new DomainError("DOCUMENTO_INVALIDO", "El archivo no es una imagen o PDF válido"),
      );
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const hallada = await cuotaConTaller(tx, input.cuotaId);
      if (!hallada) return fail(new DomainError("NO_ENCONTRADO", "Cuota no encontrada"));
      const { cuota, tallerId } = hallada;
      if (cuota.usuarioId !== input.usuarioId)
        return fail(new DomainError("FUERA_DE_ALCANCE", "La cuota no es tuya"));
      if (cuota.estado === "VALIDADO" || cuota.estado === "PAGADA")
        return fail(new DomainError("TRANSICION_INVALIDA", "La cuota ya está pagada"));
      if (cuota.estado === "EN_REVISION")
        return fail(new DomainError("TRANSICION_INVALIDA", "Tu comprobante ya está en revisión"));
      const grupoId = await usuarioEnTaller(tx, tallerId, input.usuarioId);
      if (!grupoId) return fail(new DomainError("FUERA_DE_ALCANCE", "No perteneces a este taller"));
      const ext = input.filename.split(".").pop()?.toLowerCase() ?? "pdf";
      const { ruta, sha256 } = await this.storage.save(
        tallerId,
        `cuota_${cuota.nroCuota}_${cuota.id.slice(0, 8)}.${ext}`,
        input.bytes,
        "comprobantes",
      );
      await tx
        .update(cronogramaPensiones)
        .set({
          estado: "EN_REVISION",
          comprobanteRuta: ruta,
          comprobanteSha256: sha256,
          comprobanteFecha: new Date(),
          motivo: null,
        })
        .where(eq(cronogramaPensiones.id, cuota.id));
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "SUBIR_COMPROBANTE",
        detalle: `Cuota ${cuota.nroCuota} en revisión (sha256 ${sha256.slice(0, 12)}…)`,
      });
      const correos = await correosSecretaria(tx);
      return ok({ id: cuota.id, correos });
    });
    if (!r.ok) return r;
    if (r.value.correos.length > 0) {
      await enqueueCorreo({
        para: r.value.correos,
        asunto: "Comprobante por validar",
        titulo: "Nuevo comprobante",
        texto: "Un alumno subió un comprobante. Revísalo en Pagos del taller.",
      });
    }
    return ok({ id: r.value.id });
  }
}

/** P9 Validar: la cuota queda pagada, Deudores se actualiza, se avisa al alumno. */
export class ValidarComprobanteUseCase {
  async execute(
    cuotaId: string,
    actor: Actor,
  ): Promise<Result<{ id: string; email: string | null }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const hallada = await cuotaConTaller(tx, cuotaId);
      if (!hallada) return fail(new DomainError("NO_ENCONTRADO", "Cuota no encontrada"));
      const { cuota, tallerId } = hallada;
      if (cuota.estado !== "EN_REVISION")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Un comprobante no se valida dos veces"),
        );
      await tx
        .update(cronogramaPensiones)
        .set({ estado: "VALIDADO", motivo: null })
        .where(eq(cronogramaPensiones.id, cuota.id));
      await tx.insert(pagosTaller).values({
        cronogramaId: cuota.id,
        monto: cuota.monto,
        medio: "COMPROBANTE",
        referencia: `validado:${actor.dni}`,
        registradoPor: actor.id,
      });
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "VALIDAR_COMPROBANTE",
        detalle: `Cuota ${cuota.nroCuota} validada (S/ ${cuota.monto})`,
      });
      const gente = await tx
        .select({ email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, cuota.usuarioId))
        .limit(1);
      return ok({ id: cuota.id, email: gente[0]?.email ?? null });
    });
    if (!r.ok) return r;
    if (r.value.email) {
      await enqueueCorreo({
        para: [r.value.email],
        asunto: "Tu comprobante fue validado",
        titulo: "Pago validado",
        texto: "Tu cuota quedó registrada como pagada. Gracias.",
      });
    }
    return ok({ id: r.value.id, email: r.value.email });
  }
}

/** P9 Observar: motivo obligatorio, el comprobante vuelve al alumno. */
export class ObservarComprobanteUseCase {
  async execute(
    cuotaId: string,
    input: { motivo: string },
    actor: Actor,
  ): Promise<Result<{ id: string; email: string | null }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const hallada = await cuotaConTaller(tx, cuotaId);
      if (!hallada) return fail(new DomainError("NO_ENCONTRADO", "Cuota no encontrada"));
      const { cuota, tallerId } = hallada;
      if (cuota.estado !== "EN_REVISION")
        return fail(
          new DomainError("TRANSICION_INVALIDA", "Solo un comprobante en revisión se observa"),
        );
      await tx
        .update(cronogramaPensiones)
        .set({ estado: "OBSERVADO", motivo: input.motivo.trim() })
        .where(eq(cronogramaPensiones.id, cuota.id));
      await appendAuditoriaTaller(tx, {
        tallerId,
        actorId: actor.id,
        actorDni: actor.dni,
        accion: "OBSERVAR_COMPROBANTE",
        detalle: `Cuota ${cuota.nroCuota}. Motivo: ${input.motivo.trim()}`,
      });
      const gente = await tx
        .select({ email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, cuota.usuarioId))
        .limit(1);
      return ok({ id: cuota.id, email: gente[0]?.email ?? null });
    });
    if (!r.ok) return r;
    if (r.value.email) {
      await enqueueCorreo({
        para: [r.value.email],
        asunto: "Observaron tu comprobante",
        titulo: "Comprobante observado",
        texto: `Motivo: ${input.motivo.trim()}. Sube otro comprobante desde Mis Pagos.`,
      });
    }
    return ok({ id: r.value.id, email: r.value.email });
  }
}
