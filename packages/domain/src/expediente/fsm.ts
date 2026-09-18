import type { DomainError } from "../shared/domain-error.base.js";
import { DomainError as DomainErrorImpl } from "../shared/domain-error.base.js";
import { fail, ok, type Result } from "../shared/result.js";

/** Estados macro — paridad con packages/db enums + docs/02-domain/state-machine.md */
export type EstadoExpediente =
  | "REGISTRADO"
  | "EN_PLAN"
  | "PLAN_APROBADO"
  | "EN_BORRADOR"
  | "EN_DICTAMEN"
  | "APTO_SUSTENTACION"
  | "SUSTENTADO"
  | "EN_VALIDACION"
  | "EN_APROBACION"
  | "TITULO_EMITIDO"
  | "OBSERVADO"
  | "DESAPROBADO_TRUNCO"
  | "ANULADO";

type Key = `${EstadoExpediente}>${EstadoExpediente}`;

/**
 * Transiciones legales. OBSERVADO guarda el retorno (convención: vuelve al
 * estado que lo originó; el agregado decide el destino exacto).
 */
const TRANSICIONES: ReadonlySet<Key> = new Set<Key>([
  "REGISTRADO>EN_PLAN",
  "REGISTRADO>OBSERVADO",
  "OBSERVADO>REGISTRADO",
  "REGISTRADO>ANULADO",
  "EN_PLAN>OBSERVADO",
  "EN_PLAN>PLAN_APROBADO",
  "EN_PLAN>ANULADO",
  "OBSERVADO>EN_PLAN",
  "OBSERVADO>EN_BORRADOR",
  "OBSERVADO>EN_DICTAMEN",
  "OBSERVADO>EN_VALIDACION",
  "PLAN_APROBADO>EN_BORRADOR",
  "EN_BORRADOR>OBSERVADO",
  "EN_BORRADOR>EN_DICTAMEN",
  "EN_DICTAMEN>OBSERVADO",
  "EN_DICTAMEN>APTO_SUSTENTACION",
  "APTO_SUSTENTACION>SUSTENTADO",
  "APTO_SUSTENTACION>DESAPROBADO_TRUNCO",
  "DESAPROBADO_TRUNCO>REGISTRADO",
  "SUSTENTADO>EN_VALIDACION",
  "EN_VALIDACION>OBSERVADO",
  "EN_VALIDACION>EN_APROBACION",
  "EN_APROBACION>EN_APROBACION",
  "EN_APROBACION>TITULO_EMITIDO",
]);

export function canTransition(from: EstadoExpediente, to: EstadoExpediente): boolean {
  return TRANSICIONES.has(`${from}>${to}` as Key);
}

export function assertTransition(
  from: EstadoExpediente,
  to: EstadoExpediente,
): Result<void, DomainError> {
  if (canTransition(from, to)) return ok(undefined);
  return fail(new DomainErrorImpl("TRANSICION_INVALIDA", `Transición ilegal: ${from} → ${to}`));
}

export const TRANSICIONES_LEGALES: ReadonlyArray<readonly [EstadoExpediente, EstadoExpediente]> = [
  ...TRANSICIONES,
].map((k) => k.split(">") as unknown as readonly [EstadoExpediente, EstadoExpediente]);
