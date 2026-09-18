import { semaforoPlazo } from "@pis/domain/dist/expediente/dias-habiles.js";
import { Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { type GuardadoEstado, useExpedienteDetalle } from "../api/expedientes.js";
import { DatosForm } from "../components/domain/datos-form.js";
import { DocumentoCard } from "../components/domain/documento-card.js";
import { SemaforoBadge } from "../components/domain/semaforo-badge.js";
import { TimelineFsm } from "../components/domain/timeline-fsm.js";
import { cn } from "../utils/cn.js";

type Tab = "datos" | "e1" | "e2" | "resumen";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "datos", label: "Datos" },
  { id: "e1", label: "Documentos Etapa 01" },
  { id: "e2", label: "Documentos Etapa 02" },
  { id: "resumen", label: "Resumen del Trámite" },
];

const ETAPAS_FSM = [
  "REGISTRADO",
  "EN_PLAN",
  "PLAN_APROBADO",
  "EN_BORRADOR",
  "EN_DICTAMEN",
  "APTO_SUSTENTACION",
  "SUSTENTADO",
  "EN_VALIDACION",
  "EN_APROBACION",
  "TITULO_EMITIDO",
] as const;

const indicador: Record<GuardadoEstado, { texto: string; clase: string }> = {
  sincronizado: { texto: "", clase: "" },
  editando: { texto: "Editando…", clase: "text-slate-500" },
  guardando: { texto: "Guardando…", clase: "text-blue-700" },
  guardado: { texto: "Guardado ✓", clase: "text-green-700" },
  error: { texto: "Error al guardar", clase: "text-red-700" },
  conflicto: { texto: "Conflicto de versión", clase: "text-red-700" },
};

/** Detalle del Expediente — INTERFACES §6 (Datos), §7–§8 (Documentos), dashboard tesista §5. */
export function ExpedienteDetallePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [tab, setTab] = useState<Tab>("datos");
  const [guardado, setGuardado] = useState<GuardadoEstado>("sincronizado");
  const [conflicto, setConflicto] = useState<string | null>(null);
  const query = useExpedienteDetalle(id);

  if (query.isPending) return <main className="p-8">Cargando expediente…</main>;
  if (query.isError)
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <p className="text-red-700">No se pudo cargar el expediente.</p>
        <Link className="text-sm underline" to="/">
          Volver al inicio
        </Link>
      </main>
    );

  const d = query.data;
  const ind = indicador[guardado];

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 md:p-8">
      <Link className="text-sm text-slate-600 underline" to="/">
        ← Volver al inicio
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Detalle del Expediente</h1>
          <p className="text-sm text-slate-600">
            Información, documentos y seguimiento del trámite de titulación.
          </p>
          {ind.texto && <p className={cn("mt-1 text-xs font-semibold", ind.clase)}>{ind.texto}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border px-2 py-1 text-xs">
            N° de Expediente <strong>{d.codigo}</strong>
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            {d.estado.replace("_", " ")}
          </span>
        </div>
      </header>

      {conflicto && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {conflicto}{" "}
          <button
            className="underline"
            onClick={() => {
              setConflicto(null);
              setGuardado("sincronizado");
              void query.refetch();
            }}
            type="button"
          >
            Recargar datos
          </button>
        </div>
      )}

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={cn(
              "rounded-t border-b-2 px-4 py-2 text-sm",
              tab === t.id
                ? "border-slate-900 bg-white font-semibold"
                : "border-transparent text-slate-500 hover:bg-slate-100",
            )}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="rounded-lg border bg-slate-50 p-4">
        {tab === "datos" && (
          <DatosForm detalle={d} setEstado={setGuardado} onConflicto={setConflicto} />
        )}
        {(tab === "e1" || tab === "e2") && (
          <DocumentosTab
            etapa={tab === "e1" ? "E1" : "E2"}
            expedienteId={d.id}
            items={d.checklist.filter((c) => c.etapa === (tab === "e1" ? "E1" : "E2"))}
          />
        )}
        {tab === "resumen" && (
          <div className="space-y-4">
            <TimelineFsm
              actual={
                ETAPAS_FSM.includes(d.estado as (typeof ETAPAS_FSM)[number])
                  ? (d.estado as (typeof ETAPAS_FSM)[number])
                  : "EN_PLAN"
              }
            />
            <SemaforoBadge estado={semaforoPlazo(4)} dias={4} />
            <h2 className="text-sm font-bold">Historial (cadena de custodia)</h2>
            {d.historial.length === 0 && (
              <p className="text-sm text-slate-500">Sin movimientos registrados.</p>
            )}
            <ol className="space-y-1">
              {d.historial.map((h, i) => (
                <li className="text-sm" key={`${h.createdAt}-${i}`}>
                  <span className="text-slate-500">
                    {new Date(h.createdAt).toLocaleString("es-PE")}
                  </span>{" "}
                  — {h.estadoAnterior ? `${h.estadoAnterior} → ` : ""}
                  <strong>{h.estadoNuevo}</strong>
                  {h.actorDni ? ` (DNI ${h.actorDni})` : ""}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}

function DocumentosTab({
  etapa,
  expedienteId,
  items,
}: {
  etapa: string;
  expedienteId: string;
  items: Array<{
    tipo: string;
    nombre: string;
    estado: string;
    documentoId: string | null;
    version: number | null;
    faltantes: string[];
  }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold">DOCUMENTOS - ETAPA {etapa === "E1" ? "01" : "02"}</h2>
          <p className="text-xs text-slate-500">Inserción automática de datos</p>
        </div>
        <button
          className="rounded bg-red-900 px-3 py-1.5 text-xs font-semibold text-white opacity-50"
          disabled
          title="Disponible en Fase 2 (generador documental)"
          type="button"
        >
          INSERTAR DATOS EN DOCUMENTOS
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.map((c) => (
          <DocumentoCard
            key={c.tipo}
            documentoId={c.documentoId}
            estado={c.estado}
            expedienteId={expedienteId}
            faltantes={c.faltantes}
            nombre={c.nombre}
            tipo={c.tipo}
            version={c.version}
          />
        ))}
      </div>
    </div>
  );
}
