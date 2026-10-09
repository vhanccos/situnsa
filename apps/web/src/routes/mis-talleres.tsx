import { Link } from "@tanstack/react-router";
import {
  fechaCorta,
  useAlumnos,
  useAvances,
  useFases,
  useSesiones,
  useTalleres,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { PageHeader } from "../components/ui/page-header.js";

/** P5 Mis Talleres (RF-0207): solo talleres y alumnos del asesor. */
export function MisTalleresPage() {
  const query = useTalleres({});
  const items = query.data?.items ?? [];

  return (
    <AppShell activo="/mis-talleres">
      <PageHeader titulo="Mis Talleres" descripcion="Talleres y alumnos a tu cargo" />
      {items.length === 0 && !query.isPending ? (
        <EmptyState titulo="Aún no tienes talleres asignados" />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((t) => (
              <TarjetaTaller key={t.id} tallerId={t.id} />
            ))}
          </div>
          {items.map((t) => (
            <AlumnosTaller key={t.id} tallerId={t.id} nombre={t.nombre} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function TarjetaTaller({ tallerId }: { tallerId: string }) {
  const talleres = useTalleres({});
  const t = (talleres.data?.items ?? []).find((x) => x.id === tallerId);
  const alumnos = useAlumnos(tallerId);
  const sesiones = useSesiones(tallerId);
  const avances = useAvances(tallerId);
  const filas = alumnos.data?.items ?? [];
  const baja = filas.filter((f) => f.asistenciaPct < 70).length;
  const porRevisar = (avances.data?.items ?? []).reduce(
    (n, a) => n + a.entregas.filter((e) => e.estado === "ENTREGADA").length,
    0,
  );
  const proxima = (sesiones.data?.items ?? []).find(
    (s) => s.estado === "ABIERTA" || s.estado === "PROGRAMADA",
  );

  if (!t) return null;
  return (
    <Card>
      <div className="space-y-2 p-4 md:p-5">
        <p className="text-base font-bold text-navy-950">{t.nombre}</p>
        <p className="text-sm text-grafito-600">
          {filas.length} alumnos · {t.periodo ?? ""}
        </p>
        <p className="text-sm text-grafito-600">
          Próxima: {proxima ? `${fechaCorta(proxima.fecha)} · ${proxima.horaInicio}` : "—"}
        </p>
        <p className="flex flex-wrap gap-1.5">
          {baja > 0 && (
            <span className="inline-flex items-center rounded-full border border-yellow-300 bg-aviso-100 px-2.5 py-0.5 text-xs font-semibold text-aviso-800">
              {baja} con asistencia baja
            </span>
          )}
          {porRevisar > 0 && (
            <span className="inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {porRevisar} avances por revisar
            </span>
          )}
          {baja === 0 && porRevisar === 0 && (
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Sin alertas
            </span>
          )}
        </p>
        <span className="flex flex-wrap gap-2">
          {t.enlace && (
            <a href={t.enlace} target="_blank" rel="noreferrer">
              <Button variante="exito" tamano="sm" type="button">
                Unirme a la sesión
              </Button>
            </a>
          )}
          <Link to="/taller/$id" params={{ id: t.id }}>
            <Button variante="contorno" tamano="sm" type="button">
              Ver taller
            </Button>
          </Link>
        </span>
      </div>
    </Card>
  );
}

function AlumnosTaller({ tallerId, nombre }: { tallerId: string; nombre: string }) {
  const alumnos = useAlumnos(tallerId);
  const avances = useAvances(tallerId);
  const fasesQ = useFases(tallerId);
  const filas = alumnos.data?.items ?? [];
  const fases = fasesQ.data?.fases ?? [];
  const matriz = fasesQ.data?.matriz ?? [];
  const pendientesPor = (dni: string) =>
    (avances.data?.items ?? []).reduce(
      (n, a) =>
        n + (a.entregas.some((e) => e.usuarioDni === dni && e.estado === "ENTREGADA") ? 1 : 0),
      0,
    );
  /** Fase actual: "Fase N" de la primera fase aún no cumplida. */
  const faseActual = (dni: string): string => {
    const fila = matriz.find((m) => m.usuarioDni === dni);
    if (!fila || fases.length === 0) return "—";
    const ordenadas = [...fases].sort((a, b) => a.orden - b.orden);
    for (const fase of ordenadas) {
      const celda = fila.celdas.find((c) => c.faseId === fase.id);
      if (!celda || celda.estado !== "CUMPLIDA") return `Fase ${fase.orden}`;
    }
    return "—";
  };

  return (
    <Card>
      <CardEncabezado titulo={`Alumnos · ${nombre}`} />
      <div className="p-4">
        <DataTable
          cargando={alumnos.isPending}
          vacio="Sin alumnos."
          columnas={[
            { encabezado: "Alumno", celda: (f) => <strong>{f.nombres}</strong> },
            { encabezado: "Asistencia", celda: (f) => `${f.asistenciaPct} %` },
            { encabezado: "Fase actual", celda: (f) => faseActual(f.usuarioDni) },
            { encabezado: "Avances pendientes", celda: (f) => pendientesPor(f.usuarioDni) },
            {
              encabezado: "Expediente",
              celda: (f) =>
                f.expediente ? (
                  <Link className="font-semibold text-navy-800 underline" to="/asesor">
                    {f.expediente}
                  </Link>
                ) : (
                  "—"
                ),
            },
          ]}
          filas={filas.map((f) => ({ ...f, id: f.usuarioDni }))}
        />
        <p className="mt-2 text-xs text-grafito-600">
          Solo aparecen los talleres y alumnos de este asesor.
        </p>
      </div>
    </Card>
  );
}
