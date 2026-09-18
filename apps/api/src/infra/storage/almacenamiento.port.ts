/**
 * Puerto de almacenamiento documental (port S-FIPS ADR-0005).
 * Implementación actual: disco local (LocalStorageService).
 * Futura: Drive/S3 sin tocar los use-cases.
 */
export interface AlmacenamientoPort {
  save(
    expedienteId: string,
    filename: string,
    bytes: Uint8Array,
  ): Promise<{ ruta: string; sha256: string }>;
}
