import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { type GuardadoEstado, useAnular, useExpedienteDetalle } from "../api/expedientes.js";
import { DatosForm } from "../components/domain/datos-form.js";
import { DocumentoCard } from "../components/domain/documento-card.js";
import { ResumenTab } from "../components/domain/resumen-tab.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button, botonClases } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { ConfirmDialog } from "../components/ui/confirm-dialog.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { Tab, TabPanel, Tabs, TabsLista } from "../components/ui/tabs.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

type TabId = "datos" | "e1" | "e2" | "resumen";

/** Indicador de autoguardado (legacy activarAutoguardadoAdminV4) como píldora. */
const indicador: Record<GuardadoEstado, { texto: string; clase: string }> = {
  sincronizado: { texto: "", clase: "" },
  editando: {
    texto: "CAMBIOS PENDIENTES…",
    clase: "bg-aviso-100 text-aviso-800 border-yellow-300",
  },
  guardando: {
    texto: "GUARDANDO Y SINCRONIZANDO…",
    clase: "bg-blue-100 text-blue-800 border-blue-300",
  },
  guardado: {
    texto: "GUARDADO · DOCUMENTOS SINCRONIZADOS",
    clase: "bg-verde-inst-100 text-verde-inst-700 border-green-300",
  },
  error: { texto: "ERROR AL GUARDAR", clase: "bg-red-100 text-red-800 border-red-300" },
  conflicto: { texto: "Conflicto de versión", clase: "bg-red-100 text-red-800 border-red-300" },
};

/** Detalle del Expediente — INTERFACES §§6–9. */
export function ExpedienteDetallePage() {
  const { id } = useParams({ strict: false }) as { id: string };
  const [tab, setTab] = useState<TabId>("datos");
  const [guardado, setGuardado] = useState<GuardadoEstado>("sincronizado");
  const [conflicto, setConflicto] = useState<string | null>(null);
  const [eliminar, setEliminar] = useState(false);
  const query = useExpedienteDetalle(id);
  const anular = useAnular(id);
  const avisar = useToast();
  const navigate = useNavigate();

  if (query.isPending) {
    return (
      <AppShell activo="/admin">
        <output className="space-y-2" aria-label="Cargando">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white" />
          ))}
        </output>
      </AppShell>
    );
  }
  if (query.isError) {
    return (
      <AppShell activo="/admin">
        <Card className="p-6 text-sm text-red-700">
          No se pudo cargar el expediente.{" "}
          <button
            className="font-semibold underline underline-offset-2"
            onClick={() => void query.refetch()}
            type="button"
          >
            Reintentar
          </button>{" "}
          <Link className={cn(botonClases({ variante: "contorno", tamano: "sm" }))} to="/admin">
            <ArrowLeft size={14} />
            Volver al listado
          </Link>
        </Card>
      </AppShell>
    );
  }

  const d = query.data;
  const nombreTesista = d.participante1
    ? `${d.participante1.nombres} ${d.participante1.apellidos}`.trim()
    : "—";
  const e1 = d.checklist.filter((c) => c.etapa === "E1");
  const e2 = d.checklist.filter((c) => c.etapa === "E2");
  const cargados = (xs: typeof e1): number => xs.filter((c) => c.documentoId !== null).length;
  const estadoGuardado = indicador[guardado];

  return (
    <AppShell activo="/admin">
      <Link
        className={cn(botonClases({ variante: "contorno", tamano: "sm" }), "w-fit print:hidden")}
        to="/admin"
      >
        <ArrowLeft size={16} />
        Volver al listado
      </Link>
      <PageHeader
        titulo={`Expediente ${d.codigo}`}
        descripcion={`${nombreTesista} · ${d.programa}`}
        migas={[{ etiqueta: "Expedientes", href: "/admin" }, { etiqueta: d.codigo }]}
        insignia={
          <>
            <StatusBadge estado={d.estado} />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-bold tabular-nums">
              {d.avance.marcados}/{d.avance.total} · {d.avance.pct}%
            </span>
            {estadoGuardado.texto && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  estadoGuardado.clase,
                )}
              >
                {estadoGuardado.texto}
              </span>
            )}
          </>
        }
      />
      {conflicto && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {conflicto}{" "}
          <button
            className="font-semibold underline underline-offset-2"
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
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsLista aria-label="Pestañas del expediente">
          <Tab value="datos">Datos</Tab>
          <Tab value="e1" contador={`${cargados(e1)}/${e1.length}`}>
            Documentos Etapa 01
          </Tab>
          <Tab value="e2" contador={`${cargados(e2)}/${e2.length}`}>
            Documentos Etapa 02
          </Tab>
          <Tab value="resumen" contador={`${d.avance.pct}%`}>
            Resumen del Trámite
          </Tab>
        </TabsLista>
        <TabPanel value="datos">
          <DatosForm detalle={d} setEstado={setGuardado} onConflicto={setConflicto} />
          <div className="mt-4 grid print:hidden gap-3 lg:grid-cols-[1fr_320px]">
            <div>
              <Button
                tamano="sm"
                variante="peligro"
                onClick={() => setEliminar(true)}
                type="button"
              >
                <Trash2 size={14} />
                ELIMINAR REGISTRO
              </Button>
              <p className="mt-1.5 text-xs text-grafito-600">
                Baja lógica (ANULADO): se conserva el historial y la cadena de custodia.
              </p>
            </div>
            <Card>
              <CardEncabezado titulo="Estado del expediente" />
              <div className="space-y-2 p-4">
                <p className="flex items-center gap-2 text-sm">
                  <StatusBadge estado={d.estado} />
                  <span className="font-bold tabular-nums">
                    {d.avance.marcados}/{d.avance.total} · {d.avance.pct}%
                  </span>
                </p>
                <div
                  className="h-2 overflow-hidden rounded-full bg-slate-200"
                  role="progressbar"
                  aria-valuenow={d.avance.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-navy-800"
                    style={{ width: `${d.avance.pct}%` }}
                  />
                </div>
                <p className="text-xs text-grafito-600">
                  {d.avance.subetapaActual ?? "Sin seguimiento"}
                </p>
              </div>
            </Card>
          </div>
        </TabPanel>
        <TabPanel value="e1">
          <DocumentosTab etapa="E1" expedienteId={d.id} items={e1} />
        </TabPanel>
        <TabPanel value="e2">
          <DocumentosTab etapa="E2" expedienteId={d.id} items={e2} />
        </TabPanel>
        <TabPanel value="resumen">
          <ResumenTab detalle={d} />
        </TabPanel>
      </Tabs>
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
  const cargados = items.filter((c) => c.documentoId !== null).length;
  const pct = items.length > 0 ? Math.round((cargados / items.length) * 100) : 0;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 md:px-5">
          <div>
            <h2 className="text-sm font-bold text-navy-950">
              DOCUMENTOS - ETAPA {etapa === "E1" ? "01" : "02"}
            </h2>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-grafito-600">
              Inserción automática de datos ·
              <span className="font-bold tabular-nums text-navy-950">
                {cargados}/{items.length} · {pct}%
              </span>
            </p>
            <div
              className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  pct === 100 ? "bg-verde-inst-700" : "bg-dorado-500",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
          <button
            className="rounded-lg bg-guinda-800 px-3 py-2 text-xs font-semibold text-white opacity-50"
            disabled
            title="Disponible en Fase 2 (generador documental)"
            type="button"
          >
            INSERTAR DATOS EN DOCUMENTOS
          </button>
        </div>
      </Card>
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
