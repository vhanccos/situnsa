import {
  db,
  documentosGenerados,
  jurados,
  juradosExpediente,
  sustentaciones,
  validacionesInstitucionales,
} from "@pis/db";
import {
  construirDatosDocumento,
  type DocumentoRenderizado,
  DomainError,
  type EtapaPlantilla,
  type ExpedienteDocumento,
  fail,
  ok,
  PLANTILLAS,
  type Result,
  renderizarPlantilla,
  VERSION_PLANTILLAS,
} from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { type MetaPdf, renderizarPdf } from "../../../../infra/pdf/render-documento.js";
import type { AlmacenamientoPort } from "../../../../infra/storage/almacenamiento.port.js";
import { LocalStorageService } from "../../../../infra/storage/local-storage.service.js";
import { appendAuditoria } from "../../../expedientes/expedientes.auditoria.js";
import { type DetalleRow, getDetalleById } from "../../../expedientes/expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

export interface FormatoGenerado {
  id: string;
  tipo: string;
  nombre: string;
  version: number;
  pendientes: string[];
}

/** Detalle del expediente → datos de etiquetas (separado para pruebas). */
export function expedienteParaDocumentos(
  d: DetalleRow,
  sustentacion: NonNullable<ExpedienteDocumento["sustentacion"]> | null,
  extras: Pick<ExpedienteDocumento, "jurado" | "validaciones"> = {},
): ExpedienteDocumento {
  const persona = (p: DetalleRow["participante1"]) =>
    p
      ? { nombres: p.nombres, apellidos: p.apellidos, dni: p.dni, cui: p.cui, grado: p.grado }
      : null;
  return {
    codigo: d.codigo,
    titulo: d.titulo,
    programa: d.programa,
    modalidad: d.modalidad,
    participante1: persona(d.participante1),
    participante2: persona(d.participante2),
    asesor: persona(d.asesor),
    datosAdmin: d.datosAdmin,
    sustentacion,
    ...extras,
  };
}

/** Estados en que se emite el informe para Secretaría (E6, HU-0045). */
const ESTADOS_E6 = new Set(["EN_APROBACION", "TITULO_EMITIDO"]);

/** Primera URL http(s) del detalle de la validación REPOSITORIO. */
export function urlDeDetalle(detalle: string | null): string | null {
  return /https?:\/\/\S+/i.exec(detalle ?? "")?.[0] ?? null;
}

/**
 * "INSERTAR DATOS EN DOCUMENTOS" (HU-0016/0017/0018/0020/0030, legacy
 * `insertarDatosEnDocumento`): genera los formatos de la etapa con los datos
 * vigentes del expediente. Los campos sin dato quedan resaltados y se
 * informan como pendientes (semáforo amarillo de la tarjeta documental).
 */
export class GenerarDocumentosUseCase {
  constructor(
    private readonly storage: AlmacenamientoPort = new LocalStorageService(),
    private readonly renderer: (
      doc: DocumentoRenderizado,
      meta: MetaPdf,
    ) => Promise<Uint8Array> = renderizarPdf,
  ) {}

  async execute(
    expedienteId: string,
    etapa: EtapaPlantilla,
    actor: Actor,
    ahora: Date = new Date(),
  ): Promise<Result<{ generados: FormatoGenerado[] }, DomainError>> {
    const detalle = await getDetalleById(db, expedienteId, ahora);
    if (!detalle) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
    if (detalle.estado === "ANULADO") {
      return fail(new DomainError("TRANSICION_INVALIDA", "El expediente está anulado"));
    }
    if (etapa === "E6" && !ESTADOS_E6.has(detalle.estado)) {
      return fail(
        new DomainError(
          "TRANSICION_INVALIDA",
          `El informe para Secretaría se emite con el expediente en aprobación institucional (actual: ${detalle.estado})`,
        ),
      );
    }
    const sust = await db
      .select({
        fecha: sustentaciones.fecha,
        hora: sustentaciones.hora,
        lugar: sustentaciones.lugar,
        actaVeredicto: sustentaciones.actaVeredicto,
      })
      .from(sustentaciones)
      .where(eq(sustentaciones.expedienteId, expedienteId))
      .limit(1);
    const designados = await db
      .select({
        rol: juradosExpediente.rol,
        grado: jurados.grado,
        nombres: jurados.nombres,
        apellidos: jurados.apellidos,
      })
      .from(juradosExpediente)
      .innerJoin(jurados, eq(jurados.id, juradosExpediente.juradoId))
      .where(
        and(
          eq(juradosExpediente.expedienteId, expedienteId),
          eq(juradosExpediente.instancia, "JURADO"),
        ),
      );
    const vals = await db
      .select({
        instancia: validacionesInstitucionales.instancia,
        porcentaje: validacionesInstitucionales.porcentaje,
        detalle: validacionesInstitucionales.detalle,
      })
      .from(validacionesInstitucionales)
      .where(eq(validacionesInstitucionales.expedienteId, expedienteId));
    const oti = vals.find((v) => v.instancia === "OTI_SIMILITUD");
    const repositorio = vals.find((v) => v.instancia === "REPOSITORIO");
    const datos = construirDatosDocumento(
      expedienteParaDocumentos(detalle, sust[0] ?? null, {
        jurado: designados.map((j) => ({
          rol: j.rol,
          nombre: [j.grado, j.nombres, j.apellidos].filter(Boolean).join(" "),
        })),
        validaciones: {
          similitud: oti?.porcentaje ?? null,
          urlRepositorio: urlDeDetalle(repositorio?.detalle ?? null),
        },
      }),
      ahora,
    );
    const plantillas = PLANTILLAS.filter((p) => p.etapa === etapa);
    // Render fuera de la transacción (CPU); la escritura va en un COMMIT.
    const renderizados = await Promise.all(
      plantillas.map(async (p) => {
        const doc = renderizarPlantilla(p, datos);
        const bytes = await this.renderer(doc, {
          codigo: detalle.codigo,
          versionPlantilla: VERSION_PLANTILLAS,
          generadoEn: ahora,
        });
        return { plantilla: p, doc, bytes };
      }),
    );
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const generados: FormatoGenerado[] = [];
      for (const { plantilla, doc, bytes } of renderizados) {
        const previo = await tx
          .select({ id: documentosGenerados.id, version: documentosGenerados.version })
          .from(documentosGenerados)
          .where(
            and(
              eq(documentosGenerados.expedienteId, expedienteId),
              eq(documentosGenerados.tipo, plantilla.tipo),
            ),
          )
          .limit(1);
        const version = (previo[0]?.version ?? 0) + 1;
        const { ruta, sha256 } = await this.storage.save(
          expedienteId,
          `${plantilla.tipo}_v${version}.pdf`,
          bytes,
          "generados",
        );
        const valores = {
          etapa: plantilla.etapa,
          ruta,
          sha256,
          version,
          versionPlantilla: VERSION_PLANTILLAS,
          pendientes: [...doc.pendientes],
          createdAt: ahora,
        };
        let id: string;
        if (previo[0]) {
          await tx
            .update(documentosGenerados)
            .set(valores)
            .where(eq(documentosGenerados.id, previo[0].id));
          id = previo[0].id;
        } else {
          const ins = await tx
            .insert(documentosGenerados)
            .values({ expedienteId, tipo: plantilla.tipo, ...valores })
            .returning({ id: documentosGenerados.id });
          if (!ins[0]) return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo guardar"));
          id = ins[0].id;
        }
        generados.push({
          id,
          tipo: plantilla.tipo,
          nombre: plantilla.nombre,
          version,
          pendientes: [...doc.pendientes],
        });
      }
      const conPendientes = generados.filter((g) => g.pendientes.length > 0).length;
      await appendAuditoria(tx, {
        expedienteId,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: detalle.estado,
        estadoNuevo: detalle.estado,
        detalle: `Inserción de datos en documentos ${etapa}: ${generados.length} formato(s), ${conPendientes} con campos pendientes`,
      });
      return ok({ generados });
    });
  }
}
