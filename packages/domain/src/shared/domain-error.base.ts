export type DomainErrorCode =
  | "TRANSICION_INVALIDA"
  | "PLAZO_VENCIDO"
  | "PERMISO_DENEGADO"
  | "DOCUMENTO_INVALIDO"
  | "TURNITIN_NO_CONFORME"
  | "JURADO_NO_ASIGNADO"
  | "VALIDACION_FALLIDA";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
