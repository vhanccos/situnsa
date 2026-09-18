import { Link } from "@tanstack/react-router";
import {
  CircleDashed,
  FilePlus,
  Files,
  Hourglass,
  ListChecks,
  RotateCcw,
  Search,
} from "lucide-react";
import { useState } from "react";
import { useListarExpedientes } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { botonClases } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { StatCard } from "../components/ui/stat-card.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { Tooltip } from "../components/ui/tooltip.js";
import { cn } from "../utils/cn.js";

const ETAPAS = ["", "1", "2", "3", "4", "5", "6", "7"];
const ESTADOS = ["", "REGISTRADO", "EN_PLAN", "OBSERVADO", "TITULO_EMITIDO"];
const ORDENES = [
  { v: "recientes", l: "Más recientes" },
  { v: "antiguos", l: "Más antiguos" },
  { v: "menor-avance", l: "Menor avance" },
  { v: "mayor-avance", l: "Mayor avance" },
];

/** Fecha relativa corta: "hoy", "ayer", "hace N d". */
function hace(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 30) return `hace ${dias} d`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "hace 1 mes" : `hace ${meses} meses`;
}

/** §4 Dashboard Administrativo: indicadores + filtros + tabla + TRÁMITE. */
export function AdminPage() {
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState("");
  const [estado, setEstado] = useState("");
  const [orden, setOrden] = useState("recientes");
  const [page, setPage] = useState(1);
  const query = useListarExpedientes({ q, estado, orden, page, limit: 20 });

  const items = (query.data?.items ?? []).filter((i) => !etapa || i.etapaActual === Number(etapa));
  const r = query.data?.resumen;
  const total = r?.total ?? 0;
  const pct = (n: number): string => (total > 0 ? `${Math.round((n / total) * 100)}%` : "—");
  const hayFiltros = q !== "" || etapa !== "" || estado !== "" || orden !== "recientes";
  const totalPag = query.data?.total ?? 0;
  const limit = query.data?.limit ?? 20;
  const paginas = Math.max(Math.ceil(totalPag / limit), 1);

  /** Cambiar un filtro vuelve a la primera página. */
  function conPagina1(fn: (v: string) => void): (v: string) => void {
    return (v: string) => {
      setPage(1);
      fn(v);
    };
  }

  function limpiar(): void {
    setQ("");
    setEtapa("");
    setEstado("");
    setOrden("recientes");
    setPage(1);
  }

  return (
    <AppShell activo="/admin">
      <PageHeader
        titulo="Panel de administración"
        descripcion="Consulta, filtros e historial operativo de los expedientes."
        acciones={
          <Link className={cn(botonClases({ variante: "primario" }))} to="/expedientes/nuevo">
            <FilePlus size={16} />
            Nuevo Expediente
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          etiqueta="Total de expedientes"
          valor={r?.total ?? "—"}
          icono={<Files size={20} />}
          acento="bg-navy-950"
        />
        <StatCard
          etiqueta="En curso"
          valor={r?.enCurso ?? "—"}
          icono={<Hourglass size={20} />}
          acento="bg-dorado-500"
          pie={r ? `${pct(r.enCurso)} del total` : undefined}
        />
        <StatCard
          etiqueta="Finalizados"
          valor={r?.finalizados ?? "—"}
          icono={<ListChecks size={20} />}
          acento="bg-verde-inst-700"
          pie={r ? `${pct(r.finalizados)} del total` : undefined}
        />
        <StatCard
          etiqueta="Sin iniciar"
          valor={r?.sinIniciar ?? "—"}
          icono={<CircleDashed size={20} />}
          acento="bg-slate-300"
        />
      </div>
      <Card>
        <CardEncabezado
          titulo="Expedientes en trámite"
          descripcion="Filtra por texto, etapa, estado u orden."
          tira
          accion={
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
              {query.data ? `${items.length} resultados` : "…"}
            </span>
          }
        />
        <div className="space-y-3 p-4 md:p-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grafito-600"
                aria-hidden
              />
              <input
                aria-label="Buscar"
                className={cn(controlClase, "h-9 pl-9")}
                placeholder="Nombre, DNI o expediente…"
                value={q}
                onChange={(e) => {
                  setPage(1);
                  setQ(e.target.value);
                }}
              />
            </div>
            <Select ariaLabel="Etapa" value={etapa} onChange={conPagina1(setEtapa)}>
              <option value="">Todas las etapas</option>
              {ETAPAS.filter(Boolean).map((e) => (
                <option key={e} value={e}>
                  Etapa {e}
                </option>
              ))}
            </Select>
            <Select ariaLabel="Estado" value={estado} onChange={conPagina1(setEstado)}>
              <option value="">Todos los estados</option>
              {ESTADOS.filter(Boolean).map((e) => (
                <option key={e} value={e}>
                  {e.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Select ariaLabel="Orden" value={orden} onChange={conPagina1(setOrden)}>
              {ORDENES.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </Select>
            {hayFiltros && (
              <button
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-navy-800 hover:bg-navy-950/5"
                onClick={limpiar}
                type="button"
              >
                <RotateCcw size={14} />
                Limpiar
              </button>
            )}
          </div>
          {query.isError && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              No se pudo cargar el listado.{" "}
              <button
                className="font-semibold underline underline-offset-2"
                onClick={() => void query.refetch()}
                type="button"
              >
                Reintentar
              </button>
            </p>
          )}
          <DataTable
            cargando={query.isPending}
            vacio="No existen coincidencias. Ajusta los filtros."
            columnas={[
              {
                encabezado: "Expediente",
                celda: (f) => (
                  <span>
                    <strong className="text-navy-950">{f.codigo}</strong>
                    <br />
                    <Tooltip texto={new Date(f.updatedAt).toLocaleString("es-PE")}>
                      <span className="cursor-default text-xs text-grafito-600">
                        act. {hace(f.updatedAt)}
                      </span>
                    </Tooltip>
                  </span>
                ),
              },
              {
                encabezado: "Tesista",
                celda: (f) => (
                  <span>
                    <span className="font-medium">{f.tesista}</span>
                    <br />
                    <span className="text-xs tabular-nums text-grafito-600">DNI {f.dni}</span>
                  </span>
                ),
              },
              {
                encabezado: "Programa",
                celda: (f) => <span className="text-xs">{f.programa}</span>,
              },
              {
                encabezado: "Etapa actual",
                celda: (f) => (
                  <span>
                    <span className="font-semibold">Etapa {f.etapaActual}</span>
                    <br />
                    <span className="text-xs text-grafito-600">{f.subetapaActual ?? "—"}</span>
                  </span>
                ),
              },
              { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
              {
                encabezado: "Avance",
                celda: (f) => (
                  <Tooltip texto={`${f.avancePct}% de subetapas finalizadas`}>
                    <span className="flex cursor-default items-center gap-2">
                      <span
                        className="h-2 w-20 overflow-hidden rounded-full bg-slate-200"
                        role="progressbar"
                        aria-valuenow={f.avancePct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            f.avancePct === 100 ? "bg-verde-inst-700" : "bg-navy-800",
                          )}
                          style={{ width: `${f.avancePct}%` }}
                        />
                      </span>
                      <span className="text-xs font-bold tabular-nums">{f.avancePct}%</span>
                    </span>
                  </Tooltip>
                ),
              },
              {
                encabezado: "Acción",
                clase: "text-right",
                celda: (f) => (
                  <Link
                    className={cn(botonClases({ variante: "oscuro", tamano: "sm" }))}
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
          {paginas > 1 && (
            <nav
              className="flex items-center justify-between gap-2 pt-1 text-sm"
              aria-label="Paginación"
            >
              <p className="text-xs text-grafito-600">
                Página {page} de {paginas} · {totalPag} expedientes
              </p>
              <span className="flex gap-2">
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  type="button"
                >
                  ← Anterior
                </button>
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  disabled={page >= paginas}
                  onClick={() => setPage((p) => Math.min(p + 1, paginas))}
                  type="button"
                >
                  Siguiente →
                </button>
              </span>
            </nav>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
