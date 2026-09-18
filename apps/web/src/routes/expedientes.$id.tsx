import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { type GuardadoEstado, useAnular, useExpedienteDetalle } from "../api/expedientes.js";
import { DatosForm } from "../components/domain/datos-form.js";
import { DocumentoCard } from "../components/domain/documento-card.js";
import { ResumenTab } from "../components/domain/resumen-tab.js";
import { AppShell } from "../components/layout/app-shell.js";
import { ConfirmDialog } from "../components/ui/confirm-dialog.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

type Tab = "datos" | "e1" | "e2" | "resumen";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "datos", label: "Datos" },
  { id: "e1", label: "Documentos Etapa 01" },
  { id: "e2", label: "Documentos Etapa 02" },
  { id: "resumen", label: "Resumen del Trámite" },
];

/** Estados del legacy (activarAutoguardadoAdminV4). */
const indicador: Record<GuardadoEstado, string> = {
  sincronizado: "✓ AUTOGUARDADO ACTIVO",
  editando: "CAMBIOS PENDIENTES…",
  guardando: "GUARDANDO Y SINCRONIZANDO…",
  guardado: "✓ GUARDADO · DOCUMENTOS SINCRONIZADOS",
  error: "ERROR AL GUARDAR",
  conflicto: "Conflicto de versión",
};

/** Detalle del Expediente — INTERFACES §§6–9. */
export function ExpedienteDetallePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [tab, setTab] = useState<Tab>("datos");
  const [guardado, setGuardado] = useState<GuardadoEstado>("sincronizado");
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [eliminar, setEliminar] = useState(false);
  const query = useExpedienteDetalle(id);
  const anular = useAnular(id);
  const avisar = useToast();
  const navigate = useNavigate();

  if (query.isPending) {
    return (
      <AppShell activo="">
        <output className="space-y-2" aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-white" />
          ))}
        </output>
      </AppShell>
    );
  }
  if (query.isError) {
    return (
      <AppShell activo="">
        <p className="rounded border bg-white p-6 text-sm text-red-700">
          No se pudo cargar el expediente.{" "}
          <button className="underline" onClick={() => void query.refetch()} type="button">
            Reintentar
          </button>{" "}
          <Link className="underline" to="/admin">
            Volver al listado
          </Link>
        </p>
      </AppShell>
    );
  }

  const d = query.data;

  return (
    <AppShell activo="">
      <Link className="text-sm text-navy-800 underline" to="/admin">
        ← Volver al listado
      </Link>
      <PageHeader
        titulo="Detalle del Expediente"
        descripcion="Información, documentos y seguimiento del trámite de titulación."
        insignia={
          <>
            <span className="rounded border border-slate-300 bg-white px-2 py-1 text-xs">
              N° de Expediente <strong>{d.codigo}</strong>
            </span>
            <StatusBadge estado={d.estado} />
            {indicador[guardado] && (
              <span className="text-xs font-semibold text-navy-800">{indicador[guardado]}</span>
            )}
          </>
        }
      />
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
      <nav className="flex flex-wrap gap-2" aria-label="Pestañas del expediente">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={cn(
              "rounded-t px-4 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-b-2 border-guinda-800 bg-white font-semibold text-navy-950"
                : "border-b-2 border-transparent text-grafito-600 hover:bg-white hover:text-navy-950",
            )}
            onClick={() => setTab(t.id)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </nav>
      {eliminar && (
        <ConfirmDialog
          titulo="Eliminar registro"
          mensaje={`Se dará de baja lógica al expediente ${d.codigo} (ANULADO). Se conserva el historial.`}
          confirmar="Eliminar"
          peligroso
          onConfirmar={() => {
            setEliminar(false);
            anular.mutate(undefined, {
              onSuccess: () => {
                avisar("Expediente anulado");
                void navigate({ to: "/admin" });
              },
              onError: (e) => avisar(e instanceof Error ? e.message : "No se pudo anular", "error"),
            });
          }}
          onCancelar={() => setEliminar(false)}
        />
      )}
      <div>
        {tab === "datos" && (
          <>
            <DatosForm detalle={d} setEstado={setGuardado} onConflicto={setConflicto} />
            <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
              <button
                className="rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                onClick={() => setEliminar(true)}
                type="button"
              >
                ELIMINAR REGISTRO
              </button>
              <section className="rounded-lg border bg-white p-4">
                <h2 className="text-sm font-bold">ESTADO DEL EXPEDIENTE</h2>
                <p className="mt-1 text-sm">
                  <StatusBadge estado={d.estado} /> {d.avance.marcados}/{d.avance.total} ·{" "}
                  {d.avance.pct}%
                </p>
                <p className="text-xs text-grafito-600">
                  {d.avance.subetapaActual ?? "Sin seguimiento"}
                </p>
              </section>
            </div>
          </>
        )}
        {(tab === "e1" || tab === "e2") && (
          <DocumentosTab
            etapa={tab === "e1" ? "E1" : "E2"}
            expedienteId={d.id}
            items={d.checklist.filter((c) => c.etapa === (tab === "e1" ? "E1" : "E2"))}
          />
        )}
        {tab === "resumen" && <ResumenTab detalle={d} />}
      </div>
    </AppShell>
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
          <p className="text-xs text-grafito-600">Inserción automática de datos</p>
        </div>
        <button
          className="rounded bg-guinda-800 px-3 py-1.5 text-xs font-semibold text-white opacity-50"
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
