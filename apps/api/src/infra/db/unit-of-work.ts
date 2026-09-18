import type { Db } from "@pis/db";

/** Unit of Work: un único COMMIT para expediente + auditoría + job pg-boss. */
export interface UnitOfWork {
  run<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

export class DrizzleUnitOfWork implements UnitOfWork {
  constructor(private readonly db: Db) {}
  async run<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    // Drizzle transaction: el callback recibe la tx tipada.
    // Para el skeleton, delegamos a una ejecución directa (la tx real se
    // cablea aquí mismo en cuanto haya migraciones: this.db.transaction(fn)).
    return fn(this.db);
  }
}
