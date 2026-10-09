import {
  cronogramaPensiones,
  db,
  gruposTaller,
  tallerAvances,
  tallerEntregas,
  usuarios,
} from "@pis/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { autorizar, esPersonal } from "../../infra/auth/autorizacion.js";
import { entregarArchivo, mimePorNombre } from "../../infra/http/entrega-archivo.js";
import { errorEnvelope, estadoHttp, PATRON_UUID } from "../../infra/http/errores.js";
import { LocalStorageService } from "../../infra/storage/local-storage.service.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { tallerPorId, usuarioEnTaller } from "./taller-alcance.js";
import { SubirComprobanteUseCase } from "./use-cases/comprobantes.use-cases.js";
import { SubirEntregaUseCase } from "./use-cases/fases.use-cases.js";

/**
 * Archivos del taller en rutas nativas (multipart y descargas no encajan en
 * ts-rest): comprobantes P8/P9 (imagen o PDF, 5 MB) y entregas P7 (PDF/Word).
 */

const storage = new LocalStorageService();

async function leerArchivo(req: FastifyRequest, maxBytes: number) {
  let data: Awaited<ReturnType<FastifyRequest["file"]>> | undefined;
  try {
    data = await req.file({ limits: { fileSize: maxBytes, files: 1 } });
  } catch {
    return null;
  }
  if (!data) return null;
  return { data, bytes: new Uint8Array(await data.toBuffer()) };
}

async function tallerDeCuota(cuotaId: string): Promise<string | null> {
  const cuotas = await db
    .select({ grupoId: cronogramaPensiones.grupoId })
    .from(cronogramaPensiones)
    .where(eq(cronogramaPensiones.id, cuotaId))
    .limit(1);
  const grupoId = cuotas[0]?.grupoId;
  if (!grupoId) return null;
  const grupos = await db
    .select({ tallerId: gruposTaller.tallerId })
    .from(gruposTaller)
    .where(eq(gruposTaller.id, grupoId))
    .limit(1);
  return grupos[0]?.tallerId ?? null;
}

export function registerTallerArchivosRoutes(app: FastifyInstance): void {
  /** POST /api/cuotas/:id/comprobante (multipart: file + usuarioDni opcional en Fase A). */
  app.post<{ Params: { id: string } }>(
    "/api/cuotas/:id/comprobante",
    { preHandler: requireAuth },
    async (req, reply) => {
      if (!PATRON_UUID.test(req.params.id)) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Cuota no encontrada"));
        return;
      }
      const a = await autorizar(req.actor, {
        permiso: ["portal_alumno", "crear"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) {
        await reply.status(a.status).send(a.body);
        return;
      }
      const actor = req.actor ?? { id: "", dni: "desconocido" };
      const subido = await leerArchivo(req, 5 * 1024 * 1024);
      const fields = subido?.data.fields as unknown as
        | { usuarioDni?: { value: string } }
        | undefined;
      if (!subido) {
        await reply
          .status(400)
          .send(errorEnvelope("VALIDACION_FALLIDA", "Sube una imagen o PDF de hasta 5MB"));
        return;
      }
      // Fase A: el personal puede subir en nombre del alumno indicado.
      let usuarioId = actor.id;
      const dniCampo = fields?.usuarioDni?.value;
      if (dniCampo !== undefined) {
        if (!esPersonal(a.perfil.roles)) {
          await reply.status(403).send(errorEnvelope("SIN_PERMISO", "Se requiere personal"));
          return;
        }
        const gente = await db.select().from(usuarios).where(eq(usuarios.dni, dniCampo)).limit(1);
        if (!gente[0]) {
          await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Alumno no encontrado"));
          return;
        }
        usuarioId = gente[0].id;
      }
      const uc = new SubirComprobanteUseCase(storage);
      const r = await uc.execute(
        {
          cuotaId: req.params.id,
          usuarioId,
          filename: subido.data.filename,
          bytes: subido.bytes,
        },
        actor,
      );
      if (!r.ok) {
        await reply
          .status(estadoHttp(r.error.code))
          .send(errorEnvelope(r.error.code, r.error.message));
        return;
      }
      await reply.status(201).send(r.value);
    },
  );

  /** GET /api/cuotas/:id/comprobante (P9 "Ver archivo"). */
  app.get<{ Params: { id: string } }>(
    "/api/cuotas/:id/comprobante",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    async (req, reply) => {
      if (!PATRON_UUID.test(req.params.id)) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Cuota no encontrada"));
        return;
      }
      const a = await autorizar(req.actor, { permiso: ["pagos", "ver"] });
      if (!a.ok) {
        await reply.status(a.status).send(a.body);
        return;
      }
      const actor = req.actor ?? { id: "", dni: "" };
      const filas = await db
        .select()
        .from(cronogramaPensiones)
        .where(eq(cronogramaPensiones.id, req.params.id))
        .limit(1);
      const c = filas[0];
      if (!c || !c.comprobanteRuta) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Sin comprobante"));
        return;
      }
      const tallerId = await tallerDeCuota(c.id);
      if (!tallerId) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Cuota no encontrada"));
        return;
      }
      if (!esPersonal(a.perfil.roles)) {
        if (a.perfil.roles.includes("TESISTA") && c.usuarioId !== actor.id) {
          await reply.status(403).send(errorEnvelope("FUERA_DE_ALCANCE", "La cuota no es tuya"));
          return;
        }
        if (a.perfil.roles.includes("ASESOR")) {
          const t = await tallerPorId(db, tallerId);
          if (!t || t.asesorId !== actor.id) {
            await reply.status(403).send(errorEnvelope("FUERA_DE_ALCANCE", "No es tu taller"));
            return;
          }
        }
      }
      await entregarArchivo(reply, storage, c.comprobanteRuta, {
        nombre: `comprobante_cuota_${c.nroCuota}`,
        contentType: mimePorNombre(c.comprobanteRuta),
      });
    },
  );

  /** POST /api/avances/:id/entregas (multipart: file + usuarioDni opcional en Fase A). */
  app.post<{ Params: { id: string } }>(
    "/api/avances/:id/entregas",
    { preHandler: requireAuth },
    async (req, reply) => {
      if (!PATRON_UUID.test(req.params.id)) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Avance no encontrado"));
        return;
      }
      const a = await autorizar(req.actor, {
        permiso: ["portal_alumno", "crear"],
        alternativas: [["taller", "editar"]],
      });
      if (!a.ok) {
        await reply.status(a.status).send(a.body);
        return;
      }
      const actor = req.actor ?? { id: "", dni: "desconocido" };
      const subido = await leerArchivo(req, 10 * 1024 * 1024);
      const fields = subido?.data.fields as unknown as
        | { usuarioDni?: { value: string } }
        | undefined;
      if (!subido) {
        await reply
          .status(400)
          .send(errorEnvelope("VALIDACION_FALLIDA", "Sube un PDF o Word de hasta 10MB"));
        return;
      }
      let usuarioId = actor.id;
      const dniCampo = fields?.usuarioDni?.value;
      if (dniCampo !== undefined) {
        if (!esPersonal(a.perfil.roles)) {
          await reply.status(403).send(errorEnvelope("SIN_PERMISO", "Se requiere personal"));
          return;
        }
        const gente = await db.select().from(usuarios).where(eq(usuarios.dni, dniCampo)).limit(1);
        if (!gente[0]) {
          await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Alumno no encontrado"));
          return;
        }
        usuarioId = gente[0].id;
      }
      const uc = new SubirEntregaUseCase(storage);
      const r = await uc.execute(
        {
          avanceId: req.params.id,
          usuarioId,
          filename: subido.data.filename,
          bytes: subido.bytes,
        },
        actor,
      );
      if (!r.ok) {
        await reply
          .status(estadoHttp(r.error.code))
          .send(errorEnvelope(r.error.code, r.error.message));
        return;
      }
      await reply.status(201).send(r.value);
    },
  );

  /** GET /api/entregas/:id/descargar (asesor revisa, alumno ve la suya). */
  app.get<{ Params: { id: string } }>(
    "/api/entregas/:id/descargar",
    { preHandler: async (req, reply) => requireAuth(req, reply) },
    async (req, reply) => {
      if (!PATRON_UUID.test(req.params.id)) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Entrega no encontrada"));
        return;
      }
      const a = await autorizar(req.actor, { permiso: ["taller", "ver"] });
      if (!a.ok) {
        await reply.status(a.status).send(a.body);
        return;
      }
      const actor = req.actor ?? { id: "", dni: "" };
      const filas = await db
        .select()
        .from(tallerEntregas)
        .where(eq(tallerEntregas.id, req.params.id))
        .limit(1);
      const e = filas[0];
      if (!e) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Entrega no encontrada"));
        return;
      }
      const avances = await db
        .select()
        .from(tallerAvances)
        .where(eq(tallerAvances.id, e.avanceId))
        .limit(1);
      const avance = avances[0];
      if (!avance) {
        await reply.status(404).send(errorEnvelope("NO_ENCONTRADO", "Entrega no encontrada"));
        return;
      }
      if (!esPersonal(a.perfil.roles)) {
        if (a.perfil.roles.includes("TESISTA") && e.usuarioId !== actor.id) {
          await reply.status(403).send(errorEnvelope("FUERA_DE_ALCANCE", "No es tu entrega"));
          return;
        }
        if (a.perfil.roles.includes("ASESOR")) {
          const t = await tallerPorId(db, avance.tallerId);
          if (!t || t.asesorId !== actor.id) {
            await reply.status(403).send(errorEnvelope("FUERA_DE_ALCANCE", "No es tu taller"));
            return;
          }
        } else {
          const grupoId = await usuarioEnTaller(db, avance.tallerId, actor.id);
          if (!grupoId) {
            await reply.status(403).send(errorEnvelope("FUERA_DE_ALCANCE", "No es tu taller"));
            return;
          }
        }
      }
      await entregarArchivo(reply, storage, e.ruta, {
        nombre: e.nombreOriginal,
        contentType: mimePorNombre(e.nombreOriginal),
      });
    },
  );
}
