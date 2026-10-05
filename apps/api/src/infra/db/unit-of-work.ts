import type { Db, DbExecutor } from "@pis/db";
import { TransactionRollbackError } from "drizzle-orm";

/**
 * Unit of Work: un único COMMIT para expediente + auditoría (+ archivos de
 * la misma operación). Si el callback devuelve un `Result` fallido, la
 * transacción se revierte: un error de negocio nunca deja escrituras a medias.
 */
export interface UnitOfWork {
  run<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
}

/** ¿Es un `Result` con `ok: false`? (sin acoplar la infraestructura al dominio). */
export function esResultadoFallido(valor: unknown): boolean {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "ok" in valor &&
    (valor as { ok: unknown }).ok === false
  );
}

export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}

  async run<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
    let resultado: { valor: T } | null = null;
    try {
      await this.db.transaction(async (tx) => {
        const valor = await fn(tx);
        resultado = { valor };
        if (esResultadoFallido(valor)) tx.rollback();
      });
    } catch (err) {
      if (err instanceof TransactionRollbackError && resultado !== null) {
        return (resultado as { valor: T }).valor;
      }
      throw err;
    }
    if (resultado === null) throw new Error("UnitOfWork: la transacción no produjo resultado");
    return (resultado as { valor: T }).valor;
  }
}
