import { db, sesiones, tokensAcceso, usuarios } from "@pis/db";
import { DomainError, fail, ok, type Result } from "@pis/domain";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { DrizzleUnitOfWork } from "../../../../infra/db/unit-of-work.js";
import { hashearClave } from "../../hash.js";
import { EmitirAccesoUseCase } from "./emitir-acceso.use-case.js";
import { hashTokenAcceso, tokenVigente } from "./tokens-acceso.js";

/**
 * Fija la clave con un enlace de un solo uso. Revoca las sesiones abiertas
 * (un restablecimiento corta accesos previos) y desbloquea la cuenta.
 */
export class ActivarCuentaUseCase {
  constructor(private readonly hashear: (clave: string) => string = hashearClave) {}

  async execute(
    token: string,
    password: string,
    ahora: Date = new Date(),
  ): Promise<Result<{ dni: string }, DomainError>> {
    const hash = hashTokenAcceso(token);
    const uow = new DrizzleUnitOfWork(db);
    return uow.run(async (tx) => {
      const filas = await tx
        .select()
        .from(tokensAcceso)
        .where(eq(tokensAcceso.hash, hash))
        .limit(1);
      const t = filas[0] ?? null;
      if (!t || !tokenVigente(t, ahora)) {
        return fail(
          new DomainError(
            "TOKEN_INVALIDO",
            "El enlace no es válido o ya venció. Solicita uno nuevo desde «¿Olvidaste tu clave?».",
          ),
        );
      }
      const cuenta = await tx
        .select({ id: usuarios.id, dni: usuarios.dni, activo: usuarios.activo })
        .from(usuarios)
        .where(eq(usuarios.id, t.usuarioId))
        .limit(1);
      const u = cuenta[0];
      if (!u?.activo) return fail(new DomainError("CUENTA_INACTIVA", "La cuenta está inactiva"));
      await tx
        .update(usuarios)
        .set({ passwordHash: this.hashear(password), intentosFallidos: 0, bloqueadoHasta: null })
        .where(eq(usuarios.id, u.id));
      await tx.update(tokensAcceso).set({ usadoAt: ahora }).where(eq(tokensAcceso.id, t.id));
      await tx
        .update(sesiones)
        .set({ revocadaAt: ahora })
        .where(and(eq(sesiones.usuarioId, u.id), isNull(sesiones.revocadaAt)));
      return ok({ dni: u.dni });
    });
  }
}

/**
 * «¿Olvidaste tu clave?»: si el identificador corresponde a una cuenta
 * activa, envía un enlace de restablecimiento. La respuesta al cliente es
 * siempre la misma (anti-enumeración, igual que el login).
 */
export class SolicitarRestablecimientoUseCase {
  constructor(private readonly emitir = new EmitirAccesoUseCase()) {}

  async execute(identificador: string): Promise<void> {
    const id = identificador.trim();
    const rows = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.activo, true),
          or(
            eq(usuarios.dni, id),
            eq(usuarios.cui, id),
            sql`lower(${usuarios.email}) = ${id.toLowerCase()}`,
          ),
        ),
      )
      .limit(1);
    const u = rows[0];
    if (u) await this.emitir.execute([u.id], "RESTABLECER");
  }
}
