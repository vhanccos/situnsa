import { useExpedienteDetalle, useListarExpedientes } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { PageHeader } from "../components/ui/page-header.js";
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
        <p className="rounded border bg-white p-6 text-sm text-grafito-600">
          Aún no tienes un expediente asociado a tu identidad.
        </p>
      </AppShell>
    );
  }
  if (id === undefined || query.isPending) {
    return (
      <AppShell activo="/mi-tramite">
        <output className="space-y-2" aria-label="Cargando">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-white" />
          ))}
        </output>
      </AppShell>
    );
  }
  if (query.isError) {
    return (
      <AppShell activo="/mi-tramite">
        <p className="text-sm text-red-700">
          No se pudo cargar tu trámite.{" "}
          <button className="underline" onClick={() => void query.refetch()} type="button">
            Reintentar
          </button>
        </p>
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

  return (
    <AppShell activo="/mi-tramite">
      <PageHeader
        titulo="MI TRÁMITE DE TITULACIÓN"
        descripcion="Seguimiento personal del trámite."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border-t-4 border-t-guinda-800 bg-white p-4">
          <p className="text-xs text-grafito-600">EXPEDIENTE</p>
          <p className="text-xl font-bold">{d.codigo}</p>
        </div>
        <div className="rounded-lg border-t-4 border-t-guinda-800 bg-white p-4">
          <p className="text-xs text-grafito-600">ESTADO</p>
          <p className="mt-1">
            <StatusBadge estado={d.estado} />
          </p>
        </div>
        <div className="rounded-lg border-t-4 border-t-guinda-800 bg-white p-4">
          <p className="text-xs text-grafito-600">ETAPA ACTUAL</p>
          <p className="text-sm font-bold">ETAPA {d.avance.etapaActual}</p>
        </div>
        <div className="rounded-lg border-t-4 border-t-guinda-800 bg-white p-4">
          <p className="text-xs text-grafito-600">PROGRESO</p>
          <p className="text-xl font-bold">{d.avance.pct}%</p>
        </div>
      </div>
      <section className="rounded-lg bg-white p-4">
        <h2 className="text-sm font-bold">AVANCE DEL TRÁMITE</h2>
        <div className="mt-2 space-y-2">
          {[...porEtapa.entries()].map(([etapa, subs]) => (
            <details className="rounded border" key={etapa} open={etapa === d.avance.etapaActual}>
              <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                ETAPA {etapa} — {subs[0]?.nombre.split(":")[0] ?? ""} (
                {subs.filter((s) => s.estado === "FINALIZADO").length}/{subs.length})
              </summary>
              <ol className="space-y-1 border-t px-3 py-2">
                {subs.map((s) => (
                  <li
                    className="flex items-center justify-between gap-2 text-sm"
                    key={`${s.etapa}.${s.orden}`}
                  >
                    <span>
                      {s.etapa}.{s.orden} {s.nombre}
                    </span>
                    <StatusBadge estado={s.estado} />
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
      <section className="rounded-lg bg-white p-4">
        <h2 className="text-sm font-bold">ACTUALIZACIÓN DEL TRÁMITE</h2>
        {d.mensajes.length === 0 && <p className="mt-1 text-sm text-grafito-600">Sin mensajes.</p>}
        <ul className="mt-2 space-y-2">
          {d.mensajes.map((m) => (
            <li className="rounded border-l-4 border-l-dorado-500 bg-slate-50 px-3 py-2" key={m.id}>
              <p className="text-sm font-semibold">{m.texto}</p>
              <p className="text-xs text-grafito-600">
                {new Date(m.createdAt).toLocaleString("es-PE")}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-grafito-600">
          Subetapa actual: {d.avance.subetapaActual ?? "—"} · {d.avance.marcados} de{" "}
          {d.avance.total} finalizadas.
        </p>
      </section>
    </AppShell>
  );
}
