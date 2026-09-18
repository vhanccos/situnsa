import { db, documentos, expedientes } from "@pis/db";
import { CHECKLIST_COMPLETO, DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { LocalStorageService } from "../../../../infra/storage/local-storage.service.js";
import { appendAuditoria } from "../../../expedientes/expedientes.auditoria.js";

const MAX_BYTES = 50 * 1024 * 1024; // R2: tesis de 20–50MB

/** Magic bytes PDF: el archivo debe empezar con `%PDF-` (no basta la extensión). */
const CABECERA_PDF = [0x25, 0x50, 0x44, 0x46, 0x2d] as const;

export function esPdfReal(bytes: Uint8Array): boolean {
  if (bytes.length < CABECERA_PDF.length) return false;
  return CABECERA_PDF.every((b, i) => bytes[i] === b);
}

export interface SubirDocumentoInput {
  expedienteId: string;
  tipo: string;
  filename: string;
  bytes: Uint8Array;
  actor: { id: string; dni: string };
}

export interface DocumentoSubido {
  id: string;
  tipo: string;
  version: number;
  sha256: string;
  estado: string;
}

/** Upload real: valida → disco → versionado → auditoría hash (un COMMIT). */
export class SubirDocumentoUseCase {
  constructor(private readonly storage = new LocalStorageService()) {}

  async execute(input: SubirDocumentoInput): Promise<Result<DocumentoSubido, DomainError>> {
    const def = CHECKLIST_COMPLETO.find((d) => d.tipo === input.tipo);
    if (!def) return fail(new DomainError("DOCUMENTO_INVALIDO", `Tipo desconocido: ${input.tipo}`));
    if (!input.filename.toLowerCase().endsWith(".pdf")) {
      return fail(new DomainError("DOCUMENTO_INVALIDO", "Solo se admiten archivos PDF"));
    }
    if (!esPdfReal(input.bytes)) {
      return fail(
        new DomainError("DOCUMENTO_INVALIDO", "El archivo no es un PDF válido (cabecera)"),
      );
    }
    if (input.bytes.length === 0 || input.bytes.length > MAX_BYTES) {
      return fail(new DomainError("DOCUMENTO_INVALIDO", "El archivo debe pesar entre 1B y 50MB"));
    }
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const exp = await tx
        .select({ id: expedientes.id })
        .from(expedientes)
        .where(eq(expedientes.id, input.expedienteId))
        .limit(1);
      if (!exp[0]) return fail(new DomainError("VALIDACION_FALLIDA", "Expediente no encontrado"));
      const previos = await tx
        .select()
        .from(documentos)
        .where(
          and(eq(documentos.expedienteId, input.expedienteId), eq(documentos.tipo, input.tipo)),
        );
      const version = (previos.length > 0 ? Math.max(...previos.map((p) => p.version)) : 0) + 1;
      const nombre = `${input.tipo}_v${version}.pdf`;
      const { ruta, sha256 } = await this.storage.save(input.expedienteId, nombre, input.bytes);
      let docId: string;
      if (previos.length > 0) {
        const actual = previos.find((p) => p.version === version - 1) ?? previos[0];
        if (!actual) return fail(new DomainError("VALIDACION_FALLIDA", "Documento no encontrado"));
        await tx
          .update(documentos)
          .set({ ruta, version, sha256, estado: "CARGADO" })
          .where(eq(documentos.id, actual.id));
        docId = actual.id;
      } else {
        const inserted = await tx
          .insert(documentos)
          .values({
            expedienteId: input.expedienteId,
            tipo: input.tipo,
            etapa: def.etapa,
            ruta,
            version,
            sha256,
            estado: "CARGADO",
          })
          .returning({ id: documentos.id });
        const first = inserted[0];
        if (!first)
          return fail(new DomainError("VALIDACION_FALLIDA", "No se pudo registrar el documento"));
        docId = first.id;
      }
      const estadoExp = await tx
        .select({ estado: expedientes.estado })
        .from(expedientes)
        .where(eq(expedientes.id, input.expedienteId))
        .limit(1);
      await appendAuditoria(tx, {
        expedienteId: input.expedienteId,
        actorId: input.actor.id,
        actorDni: input.actor.dni,
        estadoAnterior: estadoExp[0]?.estado ?? null,
        estadoNuevo: estadoExp[0]?.estado ?? "REGISTRADO",
        detalle: `Documento ${input.tipo} v${version} cargado`,
      });
      return ok({ id: docId, tipo: input.tipo, version, sha256, estado: "CARGADO" });
    });
  }
}
