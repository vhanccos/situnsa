import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "./client.js";
import { expedienteKey, expedientesKey, leerMensajeError } from "./expedientes.js";
import { apiFetch } from "./session.js";

/**
 * Operación del proceso (Oleada B): observar, V°B°, finalizar, seguimiento,
 * historial. Mismos patrones que expedientes.ts (fetch + envelope + invalidación).
 */

/** POST /api/expedientes/:id/observar — REGISTRADO → OBSERVADO con motivo. */
export function useObservar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${id}/observar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as unknown;
        throw new Error(leerMensajeError(b, "No se pudo observar"));
      }
      return (await res.json()) as { id: string; estado: string };
    },
    onSuccess: (_data, vars) => {
      qc.setQueryData(expedienteKey(vars.id), undefined);
      qc.invalidateQueries({ queryKey: [expedienteKey(vars.id)[0]] });
      qc.invalidateQueries({ queryKey: expedientesKey });
    },
  });
}

/** POST /api/documentos/:id/visto-bueno — V°B° académico (RN-08). */
export function useVistoBueno(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      documentoId,
      aprobado,
      comentario,
    }: {
      documentoId: string;
      aprobado: boolean;
      comentario?: string;
    }) => {
      const res = await apiFetch(`${apiBaseUrl}/api/documentos/${documentoId}/visto-bueno`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprobado, comentario }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as unknown;
        throw new Error(leerMensajeError(b, "No se pudo registrar el visto bueno"));
      }
      return (await res.json()) as { id: string; estado: string; version: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expedienteKey(expedienteId) });
    },
  });
}

/** POST /api/subetapas/:id/finalizar — cierra EN_CURSO y habilita la siguiente. */
export function useFinalizarSubetapa(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subetapaId: string) => {
      const res = await apiFetch(`${apiBaseUrl}/api/subetapas/${subetapaId}/finalizar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => null)) as unknown;
        throw new Error(leerMensajeError(b, "No se pudo finalizar"));
      }
      return (await res.json()) as {
        id: string;
        etapa: number;
        orden: number;
        estado: string;
        siguienteId: string | null;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expedienteKey(expedienteId) });
    },
  });
}

/** GET /api/expedientes/:id/seguimiento — subetapas + avance (lectura). */
export function useSeguimiento(expedienteId: string, enabled = true) {
  return useQuery({
    queryKey: ["seguimiento", expedienteId],
    enabled: enabled && expedienteId !== "",
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${expedienteId}/seguimiento`);
      if (!res.ok) throw new Error("No se pudo cargar el seguimiento");
      return (await res.json()) as {
        expedienteId: string;
        avance: {
          marcados: number;
          total: number;
          pct: number;
          etapaActual: number;
          subetapaActual: string | null;
        };
        subetapas: Array<{
          etapa: number;
          etapaNombre: string;
          orden: number;
          nombre: string;
          plazo: string | null;
          estado: string;
          responsable: string | null;
          inicio: string | null;
          fin: string | null;
        }>;
      };
    },
  });
}

/** Cierre del trámite (Oleada D, RF-04…RF-07). */
export interface JuradoCierre {
  id: string;
  dni: string;
  nombres: string;
  grado: string | null;
  rol: string;
  dictamen: string;
}

export interface SustentacionCierre {
  id: string;
  fecha: string;
  hora: string;
  lugar: string;
  modalidad: string;
  actaVeredicto: string | null;
}

export interface ValidacionCierre {
  id: string;
  instancia: string;
  estado: string;
  detalle: string | null;
}

export interface Cierre {
  expedienteId: string;
  estado: string;
  jurados: JuradoCierre[];
  sustentacion: SustentacionCierre | null;
  validaciones: ValidacionCierre[];
}

export function useCierre(expedienteId: string) {
  return useQuery({
    queryKey: ["cierre", expedienteId],
    queryFn: async (): Promise<Cierre> => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${expedienteId}/cierre`);
      if (!res.ok) throw new Error("No se pudo cargar el cierre");
      return (await res.json()) as Cierre;
    },
  });
}

async function mutarCierre<T>(path: string, method: string, body: unknown): Promise<T> {
  const res = await apiFetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as unknown;
    throw new Error(leerMensajeError(b, "Operación fallida"));
  }
  return (await res.json()) as T;
}

export function useDesignarJurado(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      dni: string;
      nombres: string;
      apellidos: string;
      grado?: string;
      rol: string;
    }): Promise<JuradoCierre> =>
      mutarCierre<JuradoCierre>(`/api/expedientes/${expedienteId}/jurados`, "POST", input).then(
        (out) => {
          qc.invalidateQueries({ queryKey: ["cierre", expedienteId] });
          return out;
        },
      ),
  });
}

export function useDictaminar(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { vinculoId: string; dictamen: string; comentario?: string }) =>
      mutarCierre<JuradoCierre>(
        `/api/expedientes/${expedienteId}/jurados/${input.vinculoId}/dictamen`,
        "POST",
        { dictamen: input.dictamen, comentario: input.comentario },
      ).then((out) => {
        qc.invalidateQueries({ queryKey: ["cierre", expedienteId] });
        return out;
      }),
  });
}

export function useProgramarSustentacion(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      fecha: string;
      hora: string;
      lugar: string;
      modalidad: string;
    }): Promise<SustentacionCierre> =>
      mutarCierre<SustentacionCierre>(
        `/api/expedientes/${expedienteId}/sustentacion`,
        "POST",
        input,
      ).then((out) => {
        qc.invalidateQueries({ queryKey: ["cierre", expedienteId] });
        return out;
      }),
  });
}

export function useRegistrarActa(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (veredicto: string): Promise<SustentacionCierre> =>
      mutarCierre<SustentacionCierre>(
        `/api/expedientes/${expedienteId}/sustentacion/acta`,
        "POST",
        { veredicto },
      ).then((out) => {
        qc.invalidateQueries({ queryKey: ["cierre", expedienteId] });
        qc.invalidateQueries({ queryKey: expedienteKey(expedienteId) });
        return out;
      }),
  });
}

export function useRegistrarValidacion(expedienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { instancia: string; estado: string; detalle?: string }) =>
      mutarCierre<ValidacionCierre>(
        `/api/expedientes/${expedienteId}/validaciones`,
        "POST",
        input,
      ).then((out) => {
        qc.invalidateQueries({ queryKey: ["cierre", expedienteId] });
        return out;
      }),
  });
}

/** GET /api/expedientes/:id/historial — mensajes + custodia (lectura). */
export function useHistorial(expedienteId: string, enabled = true) {
  return useQuery({
    queryKey: ["historial", expedienteId],
    enabled: enabled && expedienteId !== "",
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${expedienteId}/historial`);
      if (!res.ok) throw new Error("No se pudo cargar el historial");
      return (await res.json()) as {
        expedienteId: string;
        mensajes: Array<{ id: string; texto: string; autorDni: string | null; createdAt: string }>;
        historial: Array<{
          estadoAnterior: string | null;
          estadoNuevo: string;
          actorDni: string | null;
          createdAt: string;
        }>;
      };
    },
  });
}
