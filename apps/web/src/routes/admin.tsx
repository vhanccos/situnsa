import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useListarExpedientes } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { DataTable } from "../components/ui/data-table.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { StatusBadge } from "../components/ui/status-badge.js";

const ETAPAS = ["", "1", "2", "3", "4", "5", "6", "7"];
const ESTADOS = ["", "REGISTRADO", "EN_PLAN", "OBSERVADO", "TITULO_EMITIDO"];
const ORDENES = [
  { v: "recientes", l: "Más recientes" },
  { v: "antiguos", l: "Más antiguos" },
  { v: "menor-avance", l: "Menor avance" },
  { v: "mayor-avance", l: "Mayor avance" },
];

/** §4 Dashboard Administrativo: indicadores + filtros + tabla + TRÁMITE. */
export function AdminPage() {
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState("");
  const [estado, setEstado] = useState("");
  const [orden, setOrden] = useState("recientes");
  const query = useListarExpedientes({ q, estado, orden });

  const items = (query.data?.items ?? []).filter((i) => !etapa || i.etapaActual === Number(etapa));
  const r = query.data?.resumen;

  return (
    <AppShell activo="/admin">
      <PageHeader
        titulo="Panel de administración"
        descripcion="Consulta, filtros e historial operativo."
        acciones={
          <Link
            className="rounded bg-guinda-800 px-4 py-2 text-sm font-semibold text-white hover:bg-guinda-700"
            to="/expedientes/nuevo"
          >
            Nuevo Expediente
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["TOTAL DE EXPEDIENTES", r?.total ?? "—"],
          ["EN CURSO", r?.enCurso ?? "—"],
          ["FINALIZADOS", r?.finalizados ?? "—"],
          ["SIN INICIAR", r?.sinIniciar ?? "—"],
        ].map(([l, v]) => (
          <div className="rounded-lg border border-t-4 border-t-guinda-800 bg-white p-4" key={l}>
            <p className="text-xs text-grafito-600">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <section className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
        <h2 className="bg-navy-950 -m-4 mb-0 rounded-t-lg px-4 py-2 text-sm font-bold text-white">
          EXPEDIENTES EN TRÁMITE
        </h2>
        <div className="grid grid-cols-1 gap-2 pt-1 md:grid-cols-4">
          <input
            aria-label="Buscar"
            className="rounded border px-3 py-2 text-sm"
            placeholder="Nombre, DNI o expediente…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select ariaLabel="Etapa" value={etapa} onChange={setEtapa}>
            <option value="">Todas las etapas</option>
            {ETAPAS.filter(Boolean).map((e) => (
              <option key={e} value={e}>
                Etapa {e}
              </option>
            ))}
          </Select>
          <Select ariaLabel="Estado" value={estado} onChange={setEstado}>
            <option value="">Todos los estados</option>
            {ESTADOS.filter(Boolean).map((e) => (
              <option key={e} value={e}>
                {e.replace("_", " ")}
              </option>
            ))}
          </Select>
          <Select ariaLabel="Orden" value={orden} onChange={setOrden}>
            {ORDENES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </Select>
        </div>
        {query.isError && (
          <p className="text-sm text-red-700">
            No se pudo cargar el listado.{" "}
            <button className="underline" onClick={() => void query.refetch()} type="button">
              Reintentar
            </button>
          </p>
        )}
        <DataTable
          cargando={query.isPending}
          vacio="No existen coincidencias. Ajusta los filtros."
          columnas={[
            { encabezado: "EXPEDIENTE", celda: (f) => <strong>{f.codigo}</strong> },
            {
              encabezado: "TESISTA",
              celda: (f) => (
                <span>
                  {f.tesista}
                  <br />
                  <span className="text-xs text-grafito-600">DNI {f.dni}</span>
                </span>
              ),
            },
            { encabezado: "PROGRAMA", celda: (f) => <span className="text-xs">{f.programa}</span> },
            {
              encabezado: "ETAPA ACTUAL",
              celda: (f) => (
                <span>
                  Etapa {f.etapaActual}
                  <br />
                  <span className="text-xs text-grafito-600">{f.subetapaActual ?? "—"}</span>
                </span>
              ),
            },
            { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
            {
              encabezado: "AVANCE",
              celda: (f) => (
                <span className="flex items-center gap-2">
                  <span className="h-2 w-16 overflow-hidden rounded bg-slate-200">
                    <span
                      className="block h-full bg-verde-inst-700"
                      style={{ width: `${f.avancePct}%` }}
                    />
                  </span>
                  {f.avancePct}%
                </span>
              ),
            },
            {
              encabezado: "ACCIÓN",
              celda: (f) => (
                <Link
                  className="rounded bg-guinda-800 px-3 py-1.5 text-xs font-semibold text-white"
                  to="/expedientes/$id"
                  params={{ id: f.id }}
                >
                  TRÁMITE
                </Link>
              ),
            },
          ]}
          filas={items}
        />
      </section>
    </AppShell>
  );
}
