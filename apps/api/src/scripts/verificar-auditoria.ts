import "../config/cargar-env.js";
import { auditoriaTransiciones, db, expedientes, pool } from "@pis/db";
import { type EventoCadena, verificarCadena } from "@pis/domain";
import { asc, eq } from "drizzle-orm";

/**
 * Verifica la cadena de custodia SHA-256 de todos los expedientes (RNF-03:
 * paso obligatorio del runbook tras restaurar un respaldo). Sale con código 1
 * si alguna cadena está rota, para usarlo en scripts y CI.
 *   dev:  pnpm --filter @pis/api verificar-auditoria
 *   prod: node apps/api/dist/scripts/verificar-auditoria.js
 */
async function main(): Promise<number> {
  const filas = await db
    .select({
      id: auditoriaTransiciones.id,
      expedienteId: auditoriaTransiciones.expedienteId,
      codigo: expedientes.codigo,
      actorDni: auditoriaTransiciones.actorDni,
      estadoNuevo: auditoriaTransiciones.estadoNuevo,
      hashPrevio: auditoriaTransiciones.hashPrevio,
      hash: auditoriaTransiciones.hash,
      createdAt: auditoriaTransiciones.createdAt,
    })
    .from(auditoriaTransiciones)
    .innerJoin(expedientes, eq(expedientes.id, auditoriaTransiciones.expedienteId))
    .orderBy(asc(expedientes.codigo), asc(auditoriaTransiciones.createdAt));

  const porExpediente = new Map<string, { codigo: string; eventos: EventoCadena[] }>();
  for (const f of filas) {
    const grupo = porExpediente.get(f.expedienteId) ?? { codigo: f.codigo, eventos: [] };
    grupo.eventos.push({
      id: f.id,
      expedienteId: f.expedienteId,
      actorDni: f.actorDni,
      estadoNuevo: f.estadoNuevo,
      hashPrevio: f.hashPrevio,
      hash: f.hash,
      timestamp: f.createdAt.toISOString(),
    });
    porExpediente.set(f.expedienteId, grupo);
  }

  let rotas = 0;
  for (const { codigo, eventos } of porExpediente.values()) {
    const r = verificarCadena(eventos);
    if (!r.integra) {
      rotas++;
      console.error(
        `✘ ${codigo}: ${r.motivo} (evento ${r.eventoId}; ${r.verificados}/${r.eventos} verificados)`,
      );
    }
  }
  const total = porExpediente.size;
  console.log(
    rotas === 0
      ? `✔ Cadena de custodia íntegra: ${total} expediente(s), ${filas.length} evento(s)`
      : `✘ ${rotas} de ${total} expediente(s) con la cadena rota`,
  );
  return rotas === 0 ? 0 : 1;
}

main()
  .then((codigo) => {
    process.exitCode = codigo;
  })
  .catch((err: unknown) => {
    console.error("No se pudo verificar la auditoría:", err);
    process.exitCode = 2;
  })
  .finally(() => pool.end());
