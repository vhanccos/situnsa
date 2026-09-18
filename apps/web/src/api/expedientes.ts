import {
  type ActualizarDatosInput,
  type ExpedienteDetalleDTO,
  ExpedienteDetalleDTOSchema,
} from "@pis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "./client.js";

export const expedienteKey = (id: string) => ["expediente", id] as const;

async function leerDetalle(res: Response): Promise<ExpedienteDetalleDTO> {
  if (res.status === 404) throw new Error("Expediente no encontrado");
  if (!res.ok) throw new Error("No se pudo cargar el expediente");
  return ExpedienteDetalleDTOSchema.parse(await res.json());
}

/** Detalle (Datos + checklist + historial), validado contra el contrato. */
export function useExpedienteDetalle(id: string) {
  return useQuery({
    queryKey: expedienteKey(id),
    queryFn: async (): Promise<ExpedienteDetalleDTO> =>
      leerDetalle(await fetch(`${apiBaseUrl}/api/expedientes/${id}`)),
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
      const res = await fetch(`${apiBaseUrl}/api/expedientes/${id}`, {
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
    onSuccess: (data) => qc.setQueryData(expedienteKey(id), data),
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
      const res = await fetch(`${apiBaseUrl}/api/documentos/upload`, {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: expedienteKey(id) }),
  });
}

export function documentoDescargaUrl(documentoId: string): string {
  return `${apiBaseUrl}/api/documentos/${documentoId}/descargar`;
}
