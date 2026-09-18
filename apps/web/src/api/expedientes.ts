import {
  type ActualizarDatosInput,
  type ExpedienteDetalleDTO,
  ExpedienteDetalleDTOSchema,
  type InscribirPlanInput,
  InscribirPlanSchema,
} from "@pis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "./client.js";
import { apiFetch } from "./session.js";

export const expedienteKey = (id: string) => ["expediente", id] as const;
export const expedientesKey = ["expedientes"] as const;

async function leerDetalle(res: Response): Promise<ExpedienteDetalleDTO> {
  if (res.status === 404) throw new Error("Expediente no encontrado");
  if (!res.ok) throw new Error("No se pudo cargar el expediente");
  return ExpedienteDetalleDTOSchema.parse(await res.json());
}

/** Detalle (Datos + checklist + seguimiento + mensajes), validado contra el contrato. */
export function useExpedienteDetalle(id: string) {
  return useQuery({
    queryKey: expedienteKey(id),
    queryFn: async (): Promise<ExpedienteDetalleDTO> =>
      leerDetalle(await apiFetch(`${apiBaseUrl}/api/expedientes/${id}`)),
  });
}

export interface FiltrosDashboard {
  q: string;
  estado: string;
  orden: string;
}

/** Dashboard §4: tabla + indicadores en una sola lectura (§17 Optimización). */
export function useListarExpedientes(f: FiltrosDashboard) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.estado) params.set("estado", f.estado);
  if (f.orden) params.set("orden", f.orden);
  return useQuery({
    queryKey: [...expedientesKey, f.q, f.estado, f.orden],
    queryFn: async () => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes?${params}`);
      if (!res.ok) throw new Error("No se pudo cargar el listado");
      return (await res.json()) as {
        items: Array<{
          id: string;
          codigo: string;
          tesista: string;
          dni: string;
          programa: string;
          etapaActual: number;
          subetapaActual: string | null;
          estado: string;
          avancePct: number;
          updatedAt: string;
        }>;
        resumen: { total: number; enCurso: number; finalizados: number; sinIniciar: number };
      };
    },
  });
}

export type GuardadoEstado =
  | "sincronizado"
  | "editando"
  | "guardando"
  | "guardado"
  | "error"
  | "conflicto";

/** Autoguardado §6: PATCH con concurrencia optimista; 409 → conflicto. */
export function useActualizarDatos(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ActualizarDatosInput): Promise<ExpedienteDetalleDTO> => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.status === 409) {
        const body = (await res.json()) as { message: string; updatedAt: string };
        const err = new Error(body.message) as Error & { conflicto: boolean; updatedAt: string };
        err.conflicto = true;
        err.updatedAt = body.updatedAt;
        throw err;
      }
      return leerDetalle(res);
    },
    onSuccess: (data) => {
      qc.setQueryData(expedienteKey(id), data);
      qc.invalidateQueries({ queryKey: expedientesKey });
    },
  });
}

/** §10 Registro: valida en cliente (Zod) y crea REGISTRADO. */
export function useInscribir() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InscribirPlanInput): Promise<{ id: string; codigo: string }> => {
      const body = InscribirPlanSchema.parse(input);
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/inscribir-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({ message: "No se pudo registrar" }))) as {
          message?: string;
        };
        throw new Error(b.message ?? "No se pudo registrar");
      }
      const out = (await res.json()) as { id: string; codigo: string };
      qc.invalidateQueries({ queryKey: expedientesKey });
      return out;
    },
  });
}

/** §12 Validar: REGISTRADO → EN_PLAN; si ya validado, acceso directo. */
export function useValidar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<ExpedienteDetalleDTO> => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${id}/validar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({ message: "No se pudo validar" }))) as {
          message?: string;
        };
        throw new Error(b.message ?? "No se pudo validar");
      }
      const data = ExpedienteDetalleDTOSchema.parse(await res.json());
      qc.setQueryData(expedienteKey(id), data);
      qc.invalidateQueries({ queryKey: expedientesKey });
      return data;
    },
  });
}

/** Mensaje administrativo §5. */
export function usePublicarMensaje(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (texto: string) => {
      const res = await apiFetch(`${apiBaseUrl}/api/expedientes/${id}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      if (!res.ok) throw new Error("No se pudo publicar el mensaje");
      qc.invalidateQueries({ queryKey: expedienteKey(id) });
    },
  });
}

export interface SubirResult {
  id: string;
  tipo: string;
  version: number;
}

/** Upload multipart real (ruta nativa Fastify, ver documentos.routes). */
export function useSubirDocumento(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ tipo, file }: { tipo: string; file: File }): Promise<SubirResult> => {
      const form = new FormData();
      form.append("expedienteId", id);
      form.append("tipo", tipo);
      form.append("file", file);
      const res = await apiFetch(`${apiBaseUrl}/api/documentos/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({ message: "Error al subir" }))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Error al subir");
      }
      return (await res.json()) as SubirResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: expedienteKey(id) });
      qc.invalidateQueries({ queryKey: expedientesKey });
    },
  });
}

export function documentoDescargaUrl(documentoId: string): string {
  return `${apiBaseUrl}/api/documentos/${documentoId}/descargar`;
}
