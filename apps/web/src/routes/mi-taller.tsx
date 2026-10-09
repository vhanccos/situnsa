import { abrirArchivoProtegido } from "../api/expedientes.js";
import { useSession } from "../api/session.js";
import {
  diaMes,
  entregaUrl,
  fechaCorta,
  type TallerSesionDTO,
  useAlumnos,
  useAsistencia,
  useAvances,
  useMarcarAsistencia,
  useSesiones,
  useSubirEntrega,
  useTalleres,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";

const ESTADO_PROSA: Record<string, string> = {
  PROGRAMADA: "Programada",
  ABIERTA: "Asistencia abierta",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

/** P7 Mi taller (RF-0204, RF-0206, RF-0209): sesiones, asistencia y avances del alumno. */
export function MiTallerPage() {
  const talleres = useTalleres({});
  const items = (talleres.data?.items ?? []).filter((t) => t.estado === "ACTIVO");
  const actual = items[0] ?? null;

  return (
    <AppShell activo="/mi-taller">
      {talleres.isPending ? (
        <output aria-label="Cargando" className="block space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
          ))}
        </output>
      ) : !actual ? (
        <EmptyState
          titulo="Aún no estás en un taller activo"
          descripcion="Cuando Secretaría te asigne a un grupo, aquí verás tus sesiones y avances."
        />
      ) : (
        <MiTallerContenido tallerId={actual.id} />
      )}
    </AppShell>
  );
}

function MiTallerContenido({ tallerId }: { tallerId: string }) {
  const { sesion } = useSession();
  const talleres = useTalleres({});
  const t = (talleres.data?.items ?? []).find((x) => x.id === tallerId);
  const sesiones = useSesiones(tallerId);
  const avances = useAvances(tallerId);
  const alumnos = useAlumnos(tallerId);
  const filas = [...(sesiones.data?.items ?? [])].sort((a, b) => a.nro - b.nro);
  const proxima = filas.find((s) => s.estado === "ABIERTA" || s.estado === "PROGRAMADA") ?? null;
  const yo = (alumnos.data?.items ?? []).find((a) => a.usuarioDni === sesion?.dni) ?? null;

  return (
    <div className="space-y-3">
      {t && (
        <Card>
          <div className="flex flex-wrap items-center gap-2 p-4 md:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-navy-950">{t.nombre}</p>
              <p className="text-sm text-grafito-600">
                Asesor: {t.asesorNombre ?? "—"} · Próxima sesión:{" "}
                {proxima ? `${fechaCorta(proxima.fecha)} · ${proxima.horaInicio}` : "—"}
              </p>
              <p className="text-sm text-grafito-600">
                Mi asistencia: {yo !== null ? `${yo.asistenciaPct} %` : "—"}
              </p>
            </div>
            {t.enlace && (
              <a href={t.enlace} target="_blank" rel="noreferrer">
                <Button variante="exito" type="button">
                  Unirme a la sesión
                </Button>
              </a>
            )}
          </div>
        </Card>
      )}
      <Card>
        <div className="p-4">
          <DataTable
            cargando={sesiones.isPending}
            vacio="Sin sesiones todavía."
            columnas={[
              { encabezado: "Sesión", celda: (f) => f.nro },
              { encabezado: "Fecha", celda: (f) => fechaCorta(f.fecha) },
              { encabezado: "Estado", celda: (f) => ESTADO_PROSA[f.estado] ?? f.estado },
              {
                encabezado: "Mi asistencia",
                celda: (f) => <MiAsistenciaCelda tallerId={tallerId} sesion={f} />,
              },
            ]}
            filas={filas.map((f) => ({ ...f, id: f.id }))}
          />
        </div>
      </Card>
      {(avances.data?.items ?? []).map((a) => (
        <AvanceSolicitado key={a.id} tallerId={tallerId} avanceId={a.id} />
      ))}
    </div>
  );
}

function MiAsistenciaCelda({ tallerId, sesion }: { tallerId: string; sesion: TallerSesionDTO }) {
  const avisar = useToast();
  const marcar = useMarcarAsistencia(sesion.id, tallerId);
  const query = useAsistencia(
    sesion.estado === "ABIERTA" || sesion.estado === "REALIZADA" ? sesion.id : null,
  );
  const propia = query.data?.items[0] ?? null;

  if (sesion.estado === "PROGRAMADA" || sesion.estado === "CANCELADA") {
    return <span className="text-sm text-grafito-600">La asistencia aún no está abierta.</span>;
  }
  if (query.isPending) {
    return <span className="text-sm text-grafito-600">…</span>;
  }
  if (!propia || propia.estado === "PENDIENTE") {
    if (sesion.estado !== "ABIERTA") {
      return <StatusBadge estado="FALTA" />;
    }
    return (
      <Button
        variante="exito"
        tamano="sm"
        disabled={marcar.isPending}
        onClick={() =>
          void marcar
            .mutateAsync()
            .then(() => avisar(`Asistencia de la sesión ${sesion.nro} registrada`))
            .catch((e: unknown) =>
              avisar(e instanceof Error ? e.message : "No se pudo marcar", "error"),
            )
        }
        type="button"
      >
        Marcar asistencia
      </Button>
    );
  }
  return <StatusBadge estado={propia.estado} />;
}

function AvanceSolicitado({ tallerId, avanceId }: { tallerId: string; avanceId: string }) {
  const avisar = useToast();
  const query = useAvances(tallerId);
  const subir = useSubirEntrega(avanceId, tallerId);
  const avance = (query.data?.items ?? []).find((a) => a.id === avanceId);
  if (!avance) return null;
  const entregas = avance.entregas;

  async function onArchivo(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      await subir.mutateAsync(file);
      avisar("Avance entregado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo subir", "error");
    }
  }

  async function onDescargar(entregaId: string): Promise<void> {
    try {
      await abrirArchivoProtegido(entregaUrl(entregaId));
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo abrir", "error");
    }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy-950">Avance solicitado</p>
          <p className="text-sm text-grafito-600">
            {avance.descripcion} · plazo {diaMes(avance.plazo)}
          </p>
          {entregas.map((e) => (
            <p key={e.id} className="mt-1 flex flex-wrap items-center gap-1 text-xs">
              <StatusBadge estado={e.estado} extra={`v${e.version}`} />
              <button
                className="font-semibold text-navy-800 underline"
                onClick={() => void onDescargar(e.id)}
                type="button"
              >
                Ver
              </button>
              {e.observacion && <span className="text-grafito-600">· {e.observacion}</span>}
            </p>
          ))}
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-lg bg-navy-950 px-4 py-2 text-sm font-semibold text-white">
          Subir archivo
          <input
            aria-label={`Archivo para ${avance.descripcion}`}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            disabled={subir.isPending}
            onChange={(e) => void onArchivo(e.target.files?.[0])}
          />
        </label>
      </div>
    </Card>
  );
}
