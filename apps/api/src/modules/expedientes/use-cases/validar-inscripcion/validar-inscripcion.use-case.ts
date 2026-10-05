import { db, expedientes, subetapas, usuarios } from "@pis/db";
import { assertTransition, DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { enqueueCorreo } from "../../../../infra/jobs/colas.js";
import { EmitirAccesoUseCase } from "../../../auth/use-cases/acceso/emitir-acceso.use-case.js";
import { obtenerFlujo } from "../../../seguimiento/catalogo-reader.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";
import { type DetalleRow, getDetalleById, observadoDesdeDe } from "../../expedientes.repository.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * §12 Validar inscripción: REGISTRADO (u OBSERVADO en inscripción) → EN_PLAN,
 * genera el seguimiento (una sola vez) y envía a los participantes sin
 * cuenta el enlace para crear su clave. Si ya fue validado devuelve el
 * detalle (acceso directo, criterio §20). El flujo sale del catálogo en DB.
 */
export class ValidarInscripcionUseCase {
  constructor(private readonly acceso = new EmitirAccesoUseCase()) {}

  async execute(
    id: string,
    actor: Actor,
  ): Promise<Result<{ detalle: DetalleRow; yaValidado: boolean }, DomainError>> {
    const uow = new DrizzleUnitOfWork(db);
    const r = await uow.run(async (tx) => {
      const rows = await tx
        .select({ estado: expedientes.estado, metadata: expedientes.metadata })
        .from(expedientes)
        .where(eq(expedientes.id, id))
        .limit(1);
      const exp = rows[0];
      if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const yaTiene = await tx
        .select({ id: subetapas.id })
        .from(subetapas)
        .where(eq(subetapas.expedienteId, id))
        .limit(1);
      const observadoEnInscripcion =
        exp.estado === "OBSERVADO" &&
        (observadoDesdeDe(exp.metadata) ?? "REGISTRADO") === "REGISTRADO" &&
        yaTiene.length === 0;
      if (exp.estado !== "REGISTRADO" && !observadoEnInscripcion) {
        if (exp.estado === "OBSERVADO") {
          return fail(
            new DomainError(
              "TRANSICION_INVALIDA",
              "El expediente está observado en una etapa posterior: usa «Levantar observación»",
            ),
          );
        }
        const actual = await getDetalleById(tx, id);
        if (!actual) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
        return ok({ detalle: actual, yaValidado: true, sinClave: [] as string[] });
      }
      const gate = assertTransition(exp.estado, "EN_PLAN");
      if (!gate.ok) return fail(gate.error);
      const { observadoDesde: _omitido, ...metadata } = (exp.metadata ?? {}) as Record<
        string,
        unknown
      >;
      await tx
        .update(expedientes)
        .set({ estado: "EN_PLAN", metadata, updatedAt: new Date() })
        .where(eq(expedientes.id, id));
      if (yaTiene.length === 0) {
        const flujo = await obtenerFlujo(tx);
        const ahora = new Date();
        const filas = flujo.flatMap((etapa, iEtapa) =>
          etapa.subetapas.map((s, iSub) => {
            const primera = iEtapa === 0 && iSub === 0;
            return {
              expedienteId: id,
              etapa: etapa.numero,
              orden: s.orden,
              clave: s.clave,
              nombre: s.nombre,
              plazo: s.plazo,
              estado: primera ? ("EN_CURSO" as const) : ("NO_INICIADO" as const),
              responsable: etapa.responsable,
              inicio: primera ? ahora : null,
            };
          }),
        );
        if (filas.length > 0) await tx.insert(subetapas).values(filas);
      }
      await appendAuditoria(tx, {
        expedienteId: id,
        actorId: actor.id,
        actorDni: actor.dni,
        estadoAnterior: exp.estado,
        estadoNuevo: "EN_PLAN",
        detalle:
          exp.estado === "OBSERVADO"
            ? "Observación levantada: validación de inscripción (genera seguimiento)"
            : "Validación de inscripción (genera seguimiento)",
      });
      const detalle = await getDetalleById(tx, id);
      if (!detalle) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
      const participantes = [detalle.participante1?.id, detalle.participante2?.id].filter(
        (x): x is string => !!x,
      );
      const sinClave =
        participantes.length > 0
          ? (
              await tx
                .select({ id: usuarios.id })
                .from(usuarios)
                .where(and(inArray(usuarios.id, participantes), isNull(usuarios.passwordHash)))
            ).map((u) => u.id)
          : [];
      return ok({ detalle, yaValidado: false, sinClave });
    });
    if (!r.ok) return r;
    if (!r.value.yaValidado) {
      await enqueueCorreo({
        expedienteId: id,
        asunto: `Expediente ${r.value.detalle.codigo} validado`,
        titulo: "Tu inscripción fue validada",
        texto:
          "Tu expediente pasó a la etapa de evaluación del plan (Etapa 1). Desde tu portal puedes ver el avance y cargar los documentos de cada subetapa.",
      });
      if (r.value.sinClave.length > 0) await this.acceso.execute(r.value.sinClave, "ACTIVACION");
    }
    return ok({ detalle: r.value.detalle, yaValidado: r.value.yaValidado });
  }
}
