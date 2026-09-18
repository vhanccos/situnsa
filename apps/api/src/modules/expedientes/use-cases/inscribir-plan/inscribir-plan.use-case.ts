import type { InscribirPlanInput } from "@pis/contracts";
import { DomainError, fail, ok, type Result } from "@pis/domain";

export interface ExpedienteCreado {
  id: string;
  codigo: string;
}

/** RF-01: Inscribir plan. Result pattern — sin throw para reglas de negocio. */
export class InscribirPlanUseCase {
  async execute(input: InscribirPlanInput): Promise<Result<ExpedienteCreado, DomainError>> {
    if (input.modalidad === "TRABAJO_ACADEMICO" && input.titulo.trim().length < 10) {
      return fail(
        new DomainError("VALIDACION_FALLIDA", "Título demasiado corto para Trabajo Académico"),
      );
    }
    // Persistencia real (Drizzle + UoW + pg-boss) se cablea en Fase RF-01.
    // Skeleton: retorna un expediente sintético válido para verificar el router.
    const codigo = `EXP-${new Date().getFullYear()}-${input.participante1Dni.slice(-4)}`;
    return ok({ id: "00000000-0000-4000-8000-000000000000", codigo });
  }
}
