import { createHash } from "node:crypto";

/** Hash_n = SHA256(Hash_{n-1} + expedienteId + actor + nuevoEstado + docHash + timestamp) */
export function hashTransicion(input: {
  hashPrevio: string | null;
  expedienteId: string;
  actor: string;
  nuevoEstado: string;
  docHash?: string;
  timestamp: string;
}): string {
  const base = `${input.hashPrevio ?? "GENESIS"}|${input.expedienteId}|${input.actor}|${input.nuevoEstado}|${input.docHash ?? ""}|${input.timestamp}`;
  return createHash("sha256").update(base).digest("hex");
}

/** Evento de la cadena tal como se guarda (auditoria_transiciones). */
export interface EventoCadena {
  readonly id: string;
  readonly expedienteId: string;
  /** DNI con el que se calculó el hash ("sistema" sin actor). */
  readonly actorDni: string | null;
  readonly estadoNuevo: string;
  readonly hashPrevio: string | null;
  readonly hash: string;
  /** Instante ISO exacto usado en el hash (created_at). */
  readonly timestamp: string;
}

export interface VerificacionCadena {
  readonly integra: boolean;
  readonly eventos: number;
  /** Eventos verificados antes del primer fallo. */
  readonly verificados: number;
  /** Primer evento inconsistente (o null). */
  readonly eventoId: string | null;
  readonly motivo: string | null;
}

const INICIO = "GENESIS";

/**
 * Re-verifica la cadena de custodia de un expediente (RNF-01/RNF-03): recorre
 * los enlaces desde GENESIS —no el orden por fecha, que puede empatar— y
 * recalcula cada hash. Detecta alteraciones, bifurcaciones y eventos sueltos.
 */
export function verificarCadena(eventos: readonly EventoCadena[]): VerificacionCadena {
  const porPrevio = new Map<string, EventoCadena[]>();
  for (const e of eventos) {
    const clave = e.hashPrevio ?? INICIO;
    porPrevio.set(clave, [...(porPrevio.get(clave) ?? []), e]);
  }
  const roto = (verificados: number, e: EventoCadena | null, motivo: string) => ({
    integra: false,
    eventos: eventos.length,
    verificados,
    eventoId: e?.id ?? null,
    motivo,
  });
  let clave = INICIO;
  let verificados = 0;
  for (;;) {
    const siguientes = porPrevio.get(clave) ?? [];
    if (siguientes.length === 0) break;
    const [e] = siguientes;
    if (!e) break;
    if (siguientes.length > 1) {
      return roto(
        verificados,
        e,
        "La cadena se bifurca: dos eventos enlazan con el mismo anterior",
      );
    }
    if (!e.actorDni) {
      return roto(verificados, e, "Evento sin DNI del actor: no se puede recalcular su hash");
    }
    const esperado = hashTransicion({
      hashPrevio: e.hashPrevio,
      expedienteId: e.expedienteId,
      actor: e.actorDni,
      nuevoEstado: e.estadoNuevo,
      timestamp: e.timestamp,
    });
    if (esperado !== e.hash) {
      return roto(verificados, e, "El hash no corresponde al contenido del evento (alterado)");
    }
    verificados++;
    clave = e.hash;
  }
  if (verificados !== eventos.length) {
    const enCadena = new Set<string>();
    let c = INICIO;
    for (let i = 0; i < verificados; i++) {
      const e = porPrevio.get(c)?.[0];
      if (!e) break;
      enCadena.add(e.id);
      c = e.hash;
    }
    const suelto = eventos.find((e) => !enCadena.has(e.id)) ?? null;
    return roto(
      verificados,
      suelto,
      `${eventos.length - verificados} evento(s) no enlazan con la cadena`,
    );
  }
  return { integra: true, eventos: eventos.length, verificados, eventoId: null, motivo: null };
}
