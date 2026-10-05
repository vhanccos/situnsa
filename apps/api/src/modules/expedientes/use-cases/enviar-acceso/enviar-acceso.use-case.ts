import { db, expedientes, usuarios } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq, inArray } from "drizzle-orm";
import { EmitirAccesoUseCase } from "../../../auth/use-cases/acceso/emitir-acceso.use-case.js";
import { appendAuditoria } from "../../expedientes.auditoria.js";

export interface Actor {
  id: string;
  dni: string;
}

/**
 * Reenvía a los participantes el enlace de su portal (HU-0002): activación
 * si aún no crearon su clave, restablecimiento si ya la tenían.
 */
export class EnviarAccesoParticipantesUseCase {
  constructor(private readonly emitir = new EmitirAccesoUseCase()) {}

  async execute(
    expedienteId: string,
    actor: Actor,
  ): Promise<Result<{ enviados: number; destinatarios: string[] }, DomainError>> {
    const rows = await db
      .select({
        estado: expedientes.estado,
        p1: expedientes.participante1Id,
        p2: expedientes.participante2Id,
      })
      .from(expedientes)
      .where(eq(expedientes.id, expedienteId))
      .limit(1);
    const exp = rows[0];
    if (!exp) return fail(new DomainError("NO_ENCONTRADO", "Expediente no encontrado"));
    if (exp.estado === "REGISTRADO" || exp.estado === "ANULADO") {
      return fail(
        new DomainError(
          "TRANSICION_INVALIDA",
          "El acceso al portal se envía una vez validada la inscripción",
        ),
      );
    }
    const ids = [exp.p1, exp.p2].filter((x): x is string => !!x);
    if (ids.length === 0) return fail(new DomainError("VALIDACION_FALLIDA", "Sin participantes"));
    const gente = await db
      .select({ id: usuarios.id, tieneClave: usuarios.passwordHash })
      .from(usuarios)
      .where(and(inArray(usuarios.id, ids), eq(usuarios.activo, true)));
    const sinClave = gente.filter((g) => g.tieneClave === null).map((g) => g.id);
    const conClave = gente.filter((g) => g.tieneClave !== null).map((g) => g.id);
    const enviados = [
      ...(await this.emitir.execute(sinClave, "ACTIVACION")),
      ...(await this.emitir.execute(conClave, "RESTABLECER")),
    ];
    await appendAuditoria(db, {
      expedienteId,
      actorId: actor.id,
      actorDni: actor.dni,
      estadoAnterior: exp.estado,
      estadoNuevo: exp.estado,
      detalle: `Enlace de acceso al portal enviado a ${enviados.length} participante(s)`,
    });
    return ok({ enviados: enviados.length, destinatarios: enviados.map((e) => e.email) });
  }
}
