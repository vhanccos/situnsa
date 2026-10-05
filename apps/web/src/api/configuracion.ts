import { type ProcesoConfigDTO, ProcesoConfigDTOSchema } from "@pis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "./client.js";
import { errorDeRespuesta } from "./errores.js";
import { apiFetch } from "./session.js";

/** Proceso configurable (HU-0052): etapas, subetapas y documentos requeridos. */

const clave = ["configuracion", "proceso"] as const;

async function leer(res: Response): Promise<ProcesoConfigDTO> {
  if (!res.ok) throw await errorDeRespuesta(res, "No se pudo cargar la configuración");
  return ProcesoConfigDTOSchema.parse(await res.json());
}

export function useProceso() {
  return useQuery({
    queryKey: clave,
    queryFn: async () => leer(await apiFetch(`${apiBaseUrl}/api/configuracion/proceso`)),
  });
}

type Operacion =
  | { tipo: "editarEtapa"; numero: number; cambios: { nombre?: string; responsable?: string } }
  | {
      tipo: "agregarSubetapa";
      numero: number;
      datos: { nombre: string; plazo: string; obligatoria: boolean };
    }
  | {
      tipo: "editarSubetapa";
      id: string;
      cambios: { nombre?: string; plazo?: string; obligatoria?: boolean };
    }
  | { tipo: "eliminarSubetapa"; id: string }
  | {
      tipo: "agregarDocumento";
      datos: {
        tipo: string;
        nombre: string;
        etapa: "E1" | "E2";
        obligatorio: boolean;
        requeridoEn: string | null;
      };
    }
  | {
      tipo: "editarDocumento";
      tipoDocumento: string;
      cambios: { nombre?: string; obligatorio?: boolean; requeridoEn?: string | null };
    };

function peticion(op: Operacion): { ruta: string; metodo: string; cuerpo: unknown } {
  switch (op.tipo) {
    case "editarEtapa":
      return {
        ruta: `/api/configuracion/etapas/${op.numero}`,
        metodo: "PATCH",
        cuerpo: op.cambios,
      };
    case "agregarSubetapa":
      return {
        ruta: `/api/configuracion/etapas/${op.numero}/subetapas`,
        metodo: "POST",
        cuerpo: op.datos,
      };
    case "editarSubetapa":
      return { ruta: `/api/configuracion/subetapas/${op.id}`, metodo: "PATCH", cuerpo: op.cambios };
    case "eliminarSubetapa":
      return { ruta: `/api/configuracion/subetapas/${op.id}`, metodo: "DELETE", cuerpo: {} };
    case "agregarDocumento":
      return { ruta: "/api/configuracion/documentos", metodo: "POST", cuerpo: op.datos };
    case "editarDocumento":
      return {
        ruta: `/api/configuracion/documentos/${encodeURIComponent(op.tipoDocumento)}`,
        metodo: "PATCH",
        cuerpo: op.cambios,
      };
  }
}

/** Una sola mutación para todas las ediciones: la respuesta es el proceso actualizado. */
export function useEditarProceso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (op: Operacion): Promise<ProcesoConfigDTO> => {
      const p = peticion(op);
      const res = await apiFetch(`${apiBaseUrl}${p.ruta}`, {
        method: p.metodo,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p.cuerpo),
      });
      return leer(res);
    },
    onSuccess: (data) => {
      qc.setQueryData(clave, data);
    },
  });
}
