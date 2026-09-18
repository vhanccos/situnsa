export interface Specification<T> {
  isSatisfiedBy(candidate: T): boolean;
  reason(candidate: T): string | null;
}

export interface ExpedienteParaSustentar {
  dictamenesConformes: number;
  deudasBiblioteca: number;
  pensionesPendientes: number;
  versionFinalCargada: boolean;
}

/** ¿Está expedito para sustentar? 3 conformidades + 0 deudas + versión final. */
export class ExpeditoParaSustentarSpecification implements Specification<ExpedienteParaSustentar> {
  isSatisfiedBy(c: ExpedienteParaSustentar): boolean {
    return this.reason(c) === null;
  }
  reason(c: ExpedienteParaSustentar): string | null {
    if (c.dictamenesConformes < 3) return "Requiere 3 dictámenes conformes";
    if (c.deudasBiblioteca > 0) return "Tiene deudas en biblioteca";
    if (c.pensionesPendientes > 0) return "Tiene pensiones pendientes";
    if (!c.versionFinalCargada) return "Falta cargar la versión final";
    return null;
  }
}
