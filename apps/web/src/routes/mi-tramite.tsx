import { FileBadge, Flag, Gauge, MessagesSquare } from "lucide-react";
import { useExpedienteDetalle, useListarExpedientes } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Acordeon, AcordeonItem } from "../components/ui/accordion.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatCard } from "../components/ui/stat-card.js";
import { StatusBadge } from "../components/ui/status-badge.js";

/** Expediente del tesista en sesión (?vista=mis, portal alumno legacy). */
function useMiExpedienteId(): string | null | undefined {
  const lista = useListarExpedientes({ q: "", estado: "", orden: "recientes", vista: "mis" });
  if (lista.isPending) return undefined;
  if (lista.isError) return null;
  return lista.data.items[0]?.id ?? null;
}

/** §5 Dashboard del Tesista: seguimiento personal, avance y mensajes. */
export function MiTramitePage() {
  const id = useMiExpedienteId();
  const query = useExpedienteDetalle(id ?? "", id !== undefined && id !== null);

  if (id === null) {
    return (
      <AppShell activo="/mi-tramite">
        <PageHeader titulo="Mi trámite de titulación" />
        <EmptyState
          titulo="Sin expediente asociado"
          descripcion="Aún no tienes un expediente asociado a tu identidad. Acércate a mesa de partes para iniciar tu trámite."
        />
      </AppShell>
    );
  }
  if (id === undefined || query.isPending) {
    return (
      <AppShell activo="/mi-tramite">
        <output className="space-y-2" aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
          ))}
        </output>
      </AppShell>
    );
  }
  if (query.isError) {
    return (
      <AppShell activo="/mi-tramite">
        <PageHeader titulo="Mi trámite de titulación" />
        <EmptyState
          titulo="No se pudo cargar tu trámite"
          descripcion="Ocurrió un problema al obtener tu expediente."
          accion={
            <button
              className="text-sm font-semibold text-navy-800 underline underline-offset-2"
              onClick={() => void query.refetch()}
              type="button"
            >
              Reintentar
            </button>
          }
        />
      </AppShell>
    );
  }
  const d = query.data;
  const porEtapa = new Map<number, typeof d.subetapas>();
  for (const s of d.subetapas) {
    const arr = porEtapa.get(s.etapa) ?? [];
    arr.push(s);
    porEtapa.set(s.etapa, arr);
  }
  const etapas = [...porEtapa.keys()].sort((a, b) => a - b);

  return (
    <AppShell activo="/mi-tramite">
      <PageHeader
        titulo="Mi trámite de titulación"
        descripcion="Seguimiento personal de tu expediente."
        insignia={
          <>
            <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-bold">
              {d.codigo}
            </span>
            <StatusBadge estado={d.estado} />
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          etiqueta="Expediente"
          valor={<span className="text-xl">{d.codigo}</span>}
          icono={<FileBadge size={20} />}
          acento="bg-navy-950"
        />
        <StatCard
          etiqueta="Etapa actual"
          valor={`Etapa ${d.avance.etapaActual}`}
          icono={<Flag size={20} />}
          acento="bg-dorado-500"
          pie={d.avance.subetapaActual ?? "Sin seguimiento"}
        />
        <StatCard
          etiqueta="Progreso"
          valor={`${d.avance.pct}%`}
          icono={<Gauge size={20} />}
          acento="bg-verde-inst-700"
          pie={`${d.avance.marcados} de ${d.avance.total} subetapas`}
        />
        <StatCard
          etiqueta="Mensajes"
          valor={d.mensajes.length}
          icono={<MessagesSquare size={20} />}
          acento="bg-slate-300"
        />
      </div>
      <Card>
        <CardEncabezado
          titulo="Avance del trámite"
          descripcion="Etapas y subetapas de tu expediente"
        />
        <div className="p-4 md:p-5">
          <Acordeon abiertos={[`etapa-${d.avance.etapaActual}`]}>
            {etapas.map((etapa) => {
              const subs = porEtapa.get(etapa) ?? [];
              const hechos = subs.filter((s) => s.estado === "FINALIZADO").length;
              return (
                <AcordeonItem
                  key={etapa}
                  value={`etapa-${etapa}`}
                  titulo={`Etapa ${etapa} · ${subs[0]?.etapaNombre ?? ""}`}
                  meta={
                    <span className="text-xs font-bold tabular-nums text-grafito-600">
                      {hechos}/{subs.length}
                    </span>
                  }
                >
                  <ol className="divide-y divide-slate-200/70">
                    {subs.map((s) => (
                      <li
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                        key={`${s.etapa}.${s.orden}`}
                      >
                        <span>
                          <strong className="tabular-nums">
                            {s.etapa}.{s.orden}
                          </strong>{" "}
                          {s.nombre}
                        </span>
                        <StatusBadge estado={s.estado} />
                      </li>
                    ))}
                  </ol>
                </AcordeonItem>
              );
            })}
          </Acordeon>
        </div>
      </Card>
      <Card>
        <CardEncabezado
          titulo="Actualización del trámite"
          descripcion="Mensajes de la administración"
        />
        <div className="p-4 md:px-5">
          {d.mensajes.length === 0 && <p className="text-sm text-grafito-600">Sin mensajes.</p>}
          <ul className="space-y-2">
            {d.mensajes.map((m) => (
              <li
                className="rounded-lg border-l-4 border-l-dorado-500 bg-slate-50 px-3 py-2"
                key={m.id}
              >
                <p className="text-sm font-medium">{m.texto}</p>
                <p className="mt-0.5 text-xs text-grafito-600">
                  {new Date(m.createdAt).toLocaleString("es-PE")}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </AppShell>
  );
}
