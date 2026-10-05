import type { ProcesoConfigDTO } from "@pis/contracts";
import {
  catalogoDocsRequeridos,
  catalogoEtapas,
  catalogoSubetapas,
  type DbExecutor,
  db,
} from "@pis/db";
import { DomainError, esClaveSubetapa, fail, ok, type Result } from "@pis/domain";
import { and, asc, eq, gt, max, sql } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../infra/db/unit-of-work.js";

export interface Actor {
  id: string;
  dni: string;
}

/** Lectura del proceso vigente (etapas + subetapas + documentos). */
export async function leerProceso(tx: DbExecutor = db): Promise<ProcesoConfigDTO> {
  const etapas = await tx.select().from(catalogoEtapas).orderBy(asc(catalogoEtapas.numero));
  const subs = await tx
    .select()
    .from(catalogoSubetapas)
    .orderBy(asc(catalogoSubetapas.etapaNumero), asc(catalogoSubetapas.orden));
  const docs = await tx
    .select()
    .from(catalogoDocsRequeridos)
    .orderBy(asc(catalogoDocsRequeridos.etapa), asc(catalogoDocsRequeridos.tipo));
  return {
    etapas: etapas.map((e) => ({
      numero: e.numero,
      nombre: e.nombre,
      responsable: e.responsable,
      activa: e.activa,
      subetapas: subs
        .filter((s) => s.etapaNumero === e.numero)
        .map((s) => ({
          id: s.id,
          orden: s.orden,
          clave: s.clave,
          nombre: s.nombre,
          plazo: s.plazo,
          obligatoria: s.obligatoria,
        })),
    })),
    documentos: docs.map((d) => ({
      tipo: d.tipo,
      nombre: d.nombre,
      etapa: d.etapa === "E2" ? ("E2" as const) : ("E1" as const),
      obligatorio: d.obligatorio,
      requeridoEn: d.requeridoEn,
    })),
  };
}

/** Las configuraciones no tienen expediente: se registran en el log estructurado. */
function registrar(actor: Actor, accion: string): void {
  console.log(JSON.stringify({ canal: "auditoria-config", actor: actor.dni, accion }));
}

function validarRequeridoEn(v: string | null | undefined): Result<string | null, DomainError> {
  if (v === undefined || v === null || v === "") return ok(null);
  if (!esClaveSubetapa(v)) {
    return fail(new DomainError("VALIDACION_FALLIDA", `Subetapa desconocida: ${v}`));
  }
  return ok(v);
}

async function conProceso(
  actor: Actor,
  accion: string,
  fn: (tx: DbExecutor) => Promise<Result<true, DomainError>>,
): Promise<Result<ProcesoConfigDTO, DomainError>> {
  const uow = new DrizzleUnitOfWork(db);
  const r = await uow.run(async (tx) => {
    const hecho = await fn(tx);
    if (!hecho.ok) return hecho;
    return ok(await leerProceso(tx));
  });
  if (r.ok) registrar(actor, accion);
  return r;
}

export class EditarEtapaUseCase {
  execute(numero: number, input: { nombre?: string; responsable?: string }, actor: Actor) {
    return conProceso(actor, `editar etapa ${numero}`, async (tx) => {
      const cambios: { nombre?: string; responsable?: string } = {};
      if (input.nombre) cambios.nombre = input.nombre.trim();
      if (input.responsable) cambios.responsable = input.responsable.trim().toLowerCase();
      if (Object.keys(cambios).length === 0) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Nada que actualizar"));
      }
      const r = await tx
        .update(catalogoEtapas)
        .set(cambios)
        .where(eq(catalogoEtapas.numero, numero))
        .returning({ numero: catalogoEtapas.numero });
      if (r.length === 0) return fail(new DomainError("NO_ENCONTRADO", "Etapa no encontrada"));
      return ok(true);
    });
  }
}

export class AgregarSubetapaUseCase {
  execute(
    numero: number,
    input: { nombre: string; plazo: string; obligatoria: boolean },
    actor: Actor,
  ) {
    return conProceso(actor, `agregar subetapa a etapa ${numero}`, async (tx) => {
      const etapa = await tx
        .select({ numero: catalogoEtapas.numero })
        .from(catalogoEtapas)
        .where(eq(catalogoEtapas.numero, numero))
        .limit(1);
      if (!etapa[0]) return fail(new DomainError("NO_ENCONTRADO", "Etapa no encontrada"));
      const m = await tx
        .select({ maximo: max(catalogoSubetapas.orden) })
        .from(catalogoSubetapas)
        .where(eq(catalogoSubetapas.etapaNumero, numero));
      await tx.insert(catalogoSubetapas).values({
        etapaNumero: numero,
        orden: (m[0]?.maximo ?? 0) + 1,
        clave: null,
        nombre: input.nombre.trim(),
        plazo: input.plazo.trim(),
        obligatoria: input.obligatoria,
      });
      return ok(true);
    });
  }
}

export class EditarSubetapaUseCase {
  execute(
    id: string,
    input: { nombre?: string; plazo?: string; obligatoria?: boolean },
    actor: Actor,
  ) {
    return conProceso(actor, `editar subetapa ${id}`, async (tx) => {
      const filas = await tx
        .select()
        .from(catalogoSubetapas)
        .where(eq(catalogoSubetapas.id, id))
        .limit(1);
      const sub = filas[0];
      if (!sub) return fail(new DomainError("NO_ENCONTRADO", "Subetapa no encontrada"));
      if (input.obligatoria !== undefined && sub.clave !== null) {
        return fail(
          new DomainError(
            "VALIDACION_FALLIDA",
            "Las subetapas del sistema son obligatorias (tienen reglas de avance)",
          ),
        );
      }
      const cambios: { nombre?: string; plazo?: string; obligatoria?: boolean } = {};
      if (input.nombre) cambios.nombre = input.nombre.trim();
      if (input.plazo) cambios.plazo = input.plazo.trim();
      if (input.obligatoria !== undefined) cambios.obligatoria = input.obligatoria;
      if (Object.keys(cambios).length === 0) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Nada que actualizar"));
      }
      await tx.update(catalogoSubetapas).set(cambios).where(eq(catalogoSubetapas.id, id));
      return ok(true);
    });
  }
}

export class EliminarSubetapaUseCase {
  execute(id: string, actor: Actor) {
    return conProceso(actor, `eliminar subetapa ${id}`, async (tx) => {
      const filas = await tx
        .select()
        .from(catalogoSubetapas)
        .where(eq(catalogoSubetapas.id, id))
        .limit(1);
      const sub = filas[0];
      if (!sub) return fail(new DomainError("NO_ENCONTRADO", "Subetapa no encontrada"));
      if (sub.clave !== null) {
        return fail(
          new DomainError(
            "VALIDACION_FALLIDA",
            "Las subetapas del sistema no se eliminan: puedes renombrarlas o cambiar su plazo",
          ),
        );
      }
      await tx.delete(catalogoSubetapas).where(eq(catalogoSubetapas.id, id));
      // Renumera las siguientes de la misma etapa (sin huecos en el orden).
      await tx
        .update(catalogoSubetapas)
        .set({ orden: sql`${catalogoSubetapas.orden} - 1` })
        .where(
          and(
            eq(catalogoSubetapas.etapaNumero, sub.etapaNumero),
            gt(catalogoSubetapas.orden, sub.orden),
          ),
        );
      return ok(true);
    });
  }
}

export class AgregarDocumentoUseCase {
  execute(
    input: {
      tipo: string;
      nombre: string;
      etapa: "E1" | "E2";
      obligatorio: boolean;
      requeridoEn?: string | null | undefined;
    },
    actor: Actor,
  ) {
    return conProceso(actor, `agregar documento ${input.tipo}`, async (tx) => {
      const req = validarRequeridoEn(input.requeridoEn);
      if (!req.ok) return req;
      const existe = await tx
        .select({ tipo: catalogoDocsRequeridos.tipo })
        .from(catalogoDocsRequeridos)
        .where(eq(catalogoDocsRequeridos.tipo, input.tipo))
        .limit(1);
      if (existe[0]) {
        return fail(new DomainError("DATOS_DUPLICADOS", `Ya existe el documento ${input.tipo}`));
      }
      await tx.insert(catalogoDocsRequeridos).values({
        tipo: input.tipo,
        nombre: input.nombre.trim(),
        etapa: input.etapa,
        obligatorio: input.obligatorio,
        requeridoEn: req.value,
      });
      return ok(true);
    });
  }
}

export class EditarDocumentoUseCase {
  execute(
    tipo: string,
    input: { nombre?: string; obligatorio?: boolean; requeridoEn?: string | null | undefined },
    actor: Actor,
  ) {
    return conProceso(actor, `editar documento ${tipo}`, async (tx) => {
      const cambios: { nombre?: string; obligatorio?: boolean; requeridoEn?: string | null } = {};
      if (input.nombre) cambios.nombre = input.nombre.trim();
      if (input.obligatorio !== undefined) cambios.obligatorio = input.obligatorio;
      if (input.requeridoEn !== undefined) {
        const req = validarRequeridoEn(input.requeridoEn);
        if (!req.ok) return req;
        cambios.requeridoEn = req.value;
      }
      if (Object.keys(cambios).length === 0) {
        return fail(new DomainError("VALIDACION_FALLIDA", "Nada que actualizar"));
      }
      const r = await tx
        .update(catalogoDocsRequeridos)
        .set(cambios)
        .where(eq(catalogoDocsRequeridos.tipo, tipo))
        .returning({ tipo: catalogoDocsRequeridos.tipo });
      if (r.length === 0) return fail(new DomainError("NO_ENCONTRADO", "Documento no encontrado"));
      return ok(true);
    });
  }
}
