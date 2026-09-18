import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiBaseUrl } from "./client.js";
import { apiFetch } from "./session.js";

export interface Taller {
  id: string;
  nombre: string;
  asesorNombre: string | null;
  periodo: string | null;
  estado: string;
  inscritos: number;
}

export interface Programa {
  codigo: string;
  nombre: string;
}

/** Catálogos §18: cache de sesión (solo se invalidan si cambian). */
export function useProgramas() {
  return useQuery({
    queryKey: ["programas"],
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: async (): Promise<Programa[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/programas`);
      if (!res.ok) throw new Error("No se pudieron cargar los programas");
      return ((await res.json()) as { items: Programa[] }).items;
    },
  });
}

export interface Asesor {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  email: string;
  telefono: string | null;
  grado: string | null;
  activo: boolean;
  talleres: number;
}

export function useTalleres() {
  return useQuery({
    queryKey: ["talleres"],
    queryFn: async (): Promise<Taller[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/talleres`);
      if (!res.ok) throw new Error("No se pudieron cargar los talleres");
      return ((await res.json()) as { items: Taller[] }).items;
    },
  });
}

export function useCrearTaller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      nombre: string;
      asesorDni?: string | undefined;
      periodo?: string | undefined;
    }): Promise<Taller> => {
      const res = await apiFetch(`${apiBaseUrl}/api/talleres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({ message: "No se pudo crear" }))) as {
          message?: string;
        };
        throw new Error(b.message ?? "No se pudo crear");
      }
      qc.invalidateQueries({ queryKey: ["talleres"] });
      return (await res.json()) as Taller;
    },
  });
}

export function useAsesores() {
  return useQuery({
    queryKey: ["asesores"],
    queryFn: async (): Promise<Asesor[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/asesores`);
      if (!res.ok) throw new Error("No se pudieron cargar los asesores");
      return ((await res.json()) as { items: Asesor[] }).items;
    },
  });
}

export function useCrearAsesor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dni: string;
      nombres: string;
      apellidos: string;
      email: string;
      telefono?: string | undefined;
      grado?: string | undefined;
    }): Promise<Asesor> => {
      const res = await apiFetch(`${apiBaseUrl}/api/asesores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({ message: "No se pudo crear" }))) as {
          message?: string;
        };
        throw new Error(b.message ?? "No se pudo crear");
      }
      qc.invalidateQueries({ queryKey: ["asesores"] });
      return (await res.json()) as Asesor;
    },
  });
}

export interface Grupo {
  id: string;
  tallerId: string;
  tallerNombre: string;
  nombre: string;
  asesorNombre: string | null;
  estado: string;
  miembros: number;
  cuotasPendientes: number;
}

export interface Cuota {
  id: string;
  usuarioDni: string;
  nombres: string;
  nroCuota: number;
  monto: number;
  vencimiento: string;
  estado: string;
}

export interface Deudor {
  usuarioId: string;
  dni: string;
  nombres: string;
  grupoId: string;
  grupoNombre: string;
  cuotasVencidas: number;
  deudaTotal: number;
}

/** Grupos del taller (Oleada C). */
export function useGrupos() {
  return useQuery({
    queryKey: ["grupos"],
    queryFn: async (): Promise<Grupo[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/grupos`);
      if (!res.ok) throw new Error("No se pudieron cargar los grupos");
      return ((await res.json()) as { items: Grupo[] }).items;
    },
  });
}

async function mutar<T>(path: string, method: string, body: unknown): Promise<T> {
  const res = await apiFetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const b = (await res.json().catch(() => null)) as unknown;
    const env = (b as { error?: { mensaje?: unknown } })?.error;
    const legacy = (b as { message?: unknown })?.message;
    const msg =
      (typeof env?.mensaje === "string" && env.mensaje) ||
      (typeof legacy === "string" && legacy) ||
      "Operación fallida";
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export function useCrearGrupo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      tallerId: string;
      nombre: string;
      asesorDni?: string;
    }): Promise<Grupo> => {
      const out = await mutar<Grupo>("/api/grupos", "POST", input);
      qc.invalidateQueries({ queryKey: ["grupos"] });
      return out;
    },
  });
}

export function useAgregarMiembro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ grupoId, usuarioDni }: { grupoId: string; usuarioDni: string }) => {
      const out = await mutar<{ grupoId: string; usuarioId: string }>(
        `/api/grupos/${grupoId}/miembros`,
        "POST",
        { usuarioDni },
      );
      qc.invalidateQueries({ queryKey: ["grupos"] });
      return out;
    },
  });
}

export function useProgramarPensiones() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      grupoId: string;
      nroCuotas: number;
      monto: number;
      primerVencimiento: string;
    }) => {
      const out = await mutar<{ grupoId: string; cuotas: number; miembros: number }>(
        `/api/grupos/${input.grupoId}/pensiones`,
        "POST",
        {
          nroCuotas: input.nroCuotas,
          monto: input.monto,
          primerVencimiento: input.primerVencimiento,
        },
      );
      qc.invalidateQueries({ queryKey: ["grupos"] });
      qc.invalidateQueries({ queryKey: ["cuotas", input.grupoId] });
      return out;
    },
  });
}

export function useCuotas(grupoId: string | null) {
  return useQuery({
    queryKey: ["cuotas", grupoId ?? ""],
    enabled: !!grupoId,
    queryFn: async (): Promise<Cuota[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/grupos/${grupoId}/cuotas`);
      if (!res.ok) throw new Error("No se pudieron cargar las cuotas");
      return ((await res.json()) as { items: Cuota[] }).items;
    },
  });
}

export function useRegistrarPago() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      cronogramaId: string;
      monto: number;
      medio: string;
    }): Promise<unknown> => {
      const out = await mutar("/api/pagos", "POST", input);
      qc.invalidateQueries({ queryKey: ["cuotas"] });
      qc.invalidateQueries({ queryKey: ["deudores"] });
      qc.invalidateQueries({ queryKey: ["grupos"] });
      return out;
    },
  });
}

export function useDeudores() {
  return useQuery({
    queryKey: ["deudores"],
    queryFn: async (): Promise<Deudor[]> => {
      const res = await apiFetch(`${apiBaseUrl}/api/reportes/deudores`);
      if (!res.ok) throw new Error("No se pudo cargar el reporte");
      return ((await res.json()) as { items: Deudor[] }).items;
    },
  });
}

export function useToggleAsesor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }): Promise<void> => {
      const res = await apiFetch(`${apiBaseUrl}/api/asesores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      });
      if (!res.ok) throw new Error("No se pudo cambiar el estado");
      qc.invalidateQueries({ queryKey: ["asesores"] });
    },
  });
}
