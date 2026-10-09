import {
  type AlumnoTallerDTO,
  AlumnoTallerDTOSchema,
  type CuotaDTO,
  CuotaDTOSchema,
  DeudorDTOSchema,
  type FaseDTO,
  FaseDTOSchema,
  FilaMatrizSchema,
  type PaseAlumnoDTO,
  PaseAlumnoDTOSchema,
  type TallerAsistenciaDTO,
  TallerAsistenciaDTOSchema,
  type TallerAvanceDTO,
  TallerAvanceDTOSchema,
  TallerDetalleDTOSchema,
  type TallerDTO,
  TallerDTOSchema,
  TallerEntregaDTOSchema,
  type TallerSesionDTO,
  TallerSesionDTOSchema,
  VistaPreviaTallerSchema,
} from "@pis/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiBaseUrl } from "./client.js";
import { errorDeRespuesta } from "./errores.js";
import { apiFetch } from "./session.js";

export type {
  AlumnoTallerDTO,
  TallerDTO,
  TallerSesionDTO,
  TallerAsistenciaDTO,
  FaseDTO,
  TallerAvanceDTO,
  PaseAlumnoDTO,
  CuotaDTO,
};

const ItemsTaller = z.object({ items: z.array(TallerDTOSchema) });

async function get<T>(path: string, schema: z.ZodType<T>, respaldo: string): Promise<T> {
  const res = await apiFetch(`${apiBaseUrl}${path}`);
  if (!res.ok) throw await errorDeRespuesta(res, respaldo);
  return schema.parse(await res.json()) as T;
}

async function send<T>(
  path: string,
  method: string,
  body: unknown,
  schema: z.ZodType<T>,
  respaldo: string,
): Promise<T> {
  const res = await apiFetch(`${apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await errorDeRespuesta(res, respaldo);
  return schema.parse(await res.json()) as T;
}

export interface FiltrosTaller {
  periodo?: string;
  estado?: string;
  asesorDni?: string;
}

/** P1 Lista (filtros combinables). */
export function useTalleres(f: FiltrosTaller) {
  const params = new URLSearchParams();
  if (f.periodo) params.set("periodo", f.periodo);
  if (f.estado) params.set("estado", f.estado);
  if (f.asesorDni) params.set("asesorDni", f.asesorDni);
  return useQuery({
    queryKey: ["talleres", f.periodo ?? "", f.estado ?? "", f.asesorDni ?? ""],
    queryFn: () =>
      get(`/api/talleres?${params}`, ItemsTaller, "No se pudieron cargar los talleres"),
  });
}

export interface CrearTallerInput {
  nombre: string;
  periodo?: string;
  asesorDni?: string;
  fechaInicio: string;
  diasSesion: number[];
  horaInicio: string;
  horaFin: string;
  totalSesiones: number;
  cupoMax: number;
  enlace?: string;
}

export function useCrearTaller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CrearTallerInput) =>
      send("/api/talleres", "POST", input, TallerDetalleDTOSchema, "No se pudo crear el taller"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["talleres"] });
    },
  });
}

export function useVistaPrevia() {
  return useMutation({
    mutationFn: (input: CrearTallerInput) =>
      send(
        "/api/talleres/vista-previa",
        "POST",
        input,
        VistaPreviaTallerSchema,
        "No se pudo previsualizar",
      ),
  });
}

/** P3 Detalle. */
export function useTaller(id: string | null) {
  return useQuery({
    queryKey: ["taller", id ?? ""],
    enabled: !!id,
    queryFn: () =>
      get(`/api/talleres/${id}`, TallerDetalleDTOSchema, "No se pudo cargar el taller"),
  });
}

export function useEditarTaller(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: {
      nombre?: string;
      periodo?: string | null;
      cupoMax?: number;
      enlace?: string | null;
    }) => send(`/api/talleres/${id}`, "PATCH", patch, TallerDetalleDTOSchema, "No se pudo guardar"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taller", id] });
      qc.invalidateQueries({ queryKey: ["talleres"] });
    },
  });
}

export function useCambiarAsesor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { asesorDni: string; motivo: string }) =>
      send(
        `/api/talleres/${id}/asesor`,
        "POST",
        input,
        TallerDetalleDTOSchema,
        "No se pudo cambiar el asesor",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taller", id] });
      qc.invalidateQueries({ queryKey: ["talleres"] });
    },
  });
}

export function useCancelarTaller(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motivo: string) =>
      send(
        `/api/talleres/${id}/cancelar`,
        "POST",
        { motivo },
        TallerDetalleDTOSchema,
        "No se pudo cancelar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["taller", id] });
      qc.invalidateQueries({ queryKey: ["talleres"] });
    },
  });
}

/** P3/P5 Alumnos del taller. */
export function useAlumnos(tallerId: string | null) {
  return useQuery({
    queryKey: ["alumnos-taller", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/talleres/${tallerId}/alumnos`,
        z.object({ items: z.array(AlumnoTallerDTOSchema) }),
        "No se pudieron cargar los alumnos",
      ),
  });
}

/** P4 Sesiones. */
export function useSesiones(tallerId: string | null) {
  return useQuery({
    queryKey: ["sesiones", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/talleres/${tallerId}/sesiones`,
        z.object({ items: z.array(TallerSesionDTOSchema) }),
        "No se pudieron cargar las sesiones",
      ),
  });
}

export function useAsistencia(sesionId: string | null) {
  return useQuery({
    queryKey: ["asistencia", sesionId ?? ""],
    enabled: !!sesionId,
    queryFn: () =>
      get(
        `/api/sesiones/${sesionId}/asistencia`,
        z.object({ sesion: TallerSesionDTOSchema, items: z.array(TallerAsistenciaDTOSchema) }),
        "No se pudo cargar la asistencia",
      ),
  });
}

function useAccionSesion(accion: "abrir" | "cerrar", sesionId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      send(
        `/api/sesiones/${sesionId}/${accion}`,
        "POST",
        {},
        TallerSesionDTOSchema,
        "Operación fallida",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones", tallerId] });
      qc.invalidateQueries({ queryKey: ["asistencia", sesionId] });
    },
  });
}

export function useAbrirSesion(sesionId: string, tallerId: string) {
  return useAccionSesion("abrir", sesionId, tallerId);
}

export function useCerrarSesion(sesionId: string, tallerId: string) {
  return useAccionSesion("cerrar", sesionId, tallerId);
}

export function useReprogramarSesion(sesionId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { fecha: string; horaInicio?: string; horaFin?: string; motivo: string }) =>
      send(
        `/api/sesiones/${sesionId}/reprogramar`,
        "POST",
        input,
        TallerSesionDTOSchema,
        "No se pudo reprogramar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones", tallerId] });
    },
  });
}

export function useCancelarSesion(sesionId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (motivo: string) =>
      send(
        `/api/sesiones/${sesionId}/cancelar`,
        "POST",
        { motivo },
        TallerSesionDTOSchema,
        "No se pudo cancelar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones", tallerId] });
    },
  });
}

/** P7 Marcar (una vez, ventana abierta). */
export function useMarcarAsistencia(sesionId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      send(
        `/api/sesiones/${sesionId}/marcar`,
        "POST",
        {},
        z.object({ estado: z.string(), marcadaAt: z.string() }),
        "No se pudo marcar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sesiones", tallerId] });
      qc.invalidateQueries({ queryKey: ["asistencia", sesionId] });
    },
  });
}

export function useCorregirAsistencia(sesionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      usuarioDni: string;
      estado: "PRESENTE" | "FALTA" | "JUSTIFICADA";
      motivo: string;
    }) =>
      send(
        `/api/sesiones/${sesionId}/corregir`,
        "POST",
        input,
        TallerAsistenciaDTOSchema,
        "No se pudo corregir",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asistencia", sesionId] });
    },
  });
}

/** P6 Fases y matriz. */
export function useFases(tallerId: string | null) {
  return useQuery({
    queryKey: ["fases", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/talleres/${tallerId}/fases`,
        z.object({ fases: z.array(FaseDTOSchema), matriz: z.array(FilaMatrizSchema) }),
        "No se pudieron cargar las fases",
      ),
  });
}

export function useCrearFase(tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { nombre: string; descripcion?: string; fechaRef?: string }) =>
      send(
        `/api/talleres/${tallerId}/fases`,
        "POST",
        input,
        FaseDTOSchema,
        "No se pudo crear la fase",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fases", tallerId] });
    },
  });
}

export function useMarcarCumplimiento(faseId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      usuarioDni: string;
      estado: "PENDIENTE" | "CUMPLIDA" | "OBSERVADA";
      comentario?: string;
    }) =>
      send(
        `/api/fases/${faseId}/cumplimiento`,
        "POST",
        input,
        FilaMatrizSchema,
        "No se pudo marcar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fases", tallerId] });
      qc.invalidateQueries({ queryKey: ["pases", tallerId] });
    },
  });
}

/** P6/P7 Avances. */
export function useAvances(tallerId: string | null) {
  return useQuery({
    queryKey: ["avances", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/talleres/${tallerId}/avances`,
        z.object({ items: z.array(TallerAvanceDTOSchema) }),
        "No se pudieron cargar los avances",
      ),
  });
}

export function useSolicitarAvance(tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sesionId?: string; descripcion: string; plazo: string }) =>
      send(
        `/api/talleres/${tallerId}/avances`,
        "POST",
        input,
        TallerAvanceDTOSchema,
        "No se pudo solicitar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avances", tallerId] });
    },
  });
}

export function useRevisarEntrega(avanceId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      usuarioDni: string;
      estado: "CONFORME" | "OBSERVADO";
      observacion?: string;
    }) =>
      send(
        `/api/avances/${avanceId}/revisiones`,
        "POST",
        input,
        TallerEntregaDTOSchema,
        "No se pudo revisar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avances", tallerId] });
    },
  });
}

async function subirArchivo(
  path: string,
  file: File,
  respaldo: string,
): Promise<{ id: string; version?: number }> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch(`${apiBaseUrl}${path}`, { method: "POST", body: form });
  if (!res.ok) throw await errorDeRespuesta(res, respaldo);
  return (await res.json()) as { id: string; version?: number };
}

/** P7 Subir avance (PDF/Word, máx. 3 pasos). */
export function useSubirEntrega(avanceId: string, tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) =>
      subirArchivo(`/api/avances/${avanceId}/entregas`, file, "No se pudo subir"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avances", tallerId] });
    },
  });
}

/** P6 Pases. */
export function usePases(tallerId: string | null) {
  return useQuery({
    queryKey: ["pases", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/talleres/${tallerId}/pases`,
        z.object({ items: z.array(PaseAlumnoDTOSchema) }),
        "No se pudieron cargar los pases",
      ),
  });
}

export function useValidarPase(tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (usuarioDni: string) =>
      send(
        `/api/talleres/${tallerId}/pases`,
        "POST",
        { usuarioDni },
        PaseAlumnoDTOSchema,
        "No se pudo validar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pases", tallerId] });
    },
  });
}

export function useRevertirPase(tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { usuarioDni: string; motivo: string }) =>
      send(
        `/api/talleres/${tallerId}/pases/revertir`,
        "POST",
        input,
        PaseAlumnoDTOSchema,
        "No se pudo revertir",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pases", tallerId] });
    },
  });
}

/** P8 Mis Pagos. */
export function useMisCuotas(tallerId: string | null) {
  return useQuery({
    queryKey: ["mis-cuotas", tallerId ?? ""],
    enabled: !!tallerId,
    queryFn: () =>
      get(
        `/api/mis-cuotas?tallerId=${tallerId}`,
        z.object({ items: z.array(CuotaDTOSchema) }),
        "No se pudieron cargar tus cuotas",
      ),
  });
}

/** P8 Subir comprobante (imagen o PDF, 5 MB). */
export function useSubirComprobante(tallerId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cuotaId, file }: { cuotaId: string; file: File }) =>
      subirArchivo(`/api/cuotas/${cuotaId}/comprobante`, file, "No se pudo subir el comprobante"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mis-cuotas", tallerId] });
    },
  });
}

export function useValidarComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cuotaId: string) =>
      send(`/api/cuotas/${cuotaId}/validar`, "POST", {}, CuotaDTOSchema, "No se pudo validar"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deudores"] });
    },
  });
}

export function useObservarComprobante() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cuotaId, motivo }: { cuotaId: string; motivo: string }) =>
      send(
        `/api/cuotas/${cuotaId}/observar`,
        "POST",
        { motivo },
        CuotaDTOSchema,
        "No se pudo observar",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deudores"] });
    },
  });
}

/** P9 Deudores (filtros por taller y período). */
export function useDeudoresTaller(tallerId?: string, periodo?: string) {
  const params = new URLSearchParams();
  if (tallerId) params.set("tallerId", tallerId);
  if (periodo) params.set("periodo", periodo);
  const qs = params.toString();
  return useQuery({
    queryKey: ["deudores", tallerId ?? "", periodo ?? ""],
    queryFn: () =>
      get(
        `/api/reportes/deudores${qs ? `?${qs}` : ""}`,
        z.object({ items: z.array(DeudorDTOSchema) }),
        "No se pudieron cargar los deudores",
      ),
  });
}

export function comprobanteUrl(cuotaId: string): string {
  return `${apiBaseUrl}/api/cuotas/${cuotaId}/comprobante`;
}

const DIAS_CORTO = ["", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** "Sáb y Dom 09:00" (P1: días y hora de inicio). */
export function diasHora(t: {
  diasSesion: number[];
  horaInicio: string | null;
  horaFin: string | null;
}): string {
  if (t.diasSesion.length === 0) return "—";
  const dias = t.diasSesion
    .map((d) => DIAS_CORTO[d] ?? "")
    .filter(Boolean)
    .join(" y ");
  return t.horaInicio ? `${dias} ${t.horaInicio}` : dias;
}

const DIAS_LARGO = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Día ISO (1=Lun) de una fecha AAAA-MM-DD en hora de Perú. */
function diaIso(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00-05:00`);
  return ((d.getUTCDay() + 6) % 7) + 1;
}

/** "Sáb 17/10" (P4/P5/P7/P8/P9: fecha corta con día). */
export function fechaCorta(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const corto = DIAS_CORTO[diaIso(fecha)] ?? "";
  return `${corto} ${m[3]}/${m[2]}`;
}

/** "31/10" (P6/P7: día y mes). */
export function diaMes(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  return `${m[3]}/${m[2]}`;
}

/** "sáb 17/10/2026" (P2: vista previa). */
export function fechaLarga(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (!m) return fecha;
  const largo = DIAS_LARGO[diaIso(fecha)] ?? "";
  return `${largo.toLowerCase()} ${m[3]}/${m[2]}/${m[1]}`;
}

/** Etiqueta de estado de sesión (P4/P7: "ASISTENCIA ABIERTA"). */
export function estadoSesionEtiqueta(estado: string): string {
  if (estado === "ABIERTA") return "ASISTENCIA ABIERTA";
  return estado;
}

/** "12 días" / "1 día" de atraso respecto a hoy en Lima (P9). */
export function atrasoTexto(vencimiento: string): string {
  const hoy = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const dias = Math.max(
    0,
    Math.round(
      (Date.parse(`${hoy}T00:00:00-05:00`) - Date.parse(`${vencimiento}T00:00:00-05:00`)) /
        86_400_000,
    ),
  );
  return dias === 1 ? "1 día" : `${dias} días`;
}

export function entregaUrl(entregaId: string): string {
  return `${apiBaseUrl}/api/entregas/${entregaId}/descargar`;
}
