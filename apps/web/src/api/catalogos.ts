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
