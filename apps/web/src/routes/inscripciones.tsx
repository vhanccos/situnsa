import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useListarExpedientes, useValidar } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { ConfirmDialog } from "../components/ui/confirm-dialog.js";
import { DataTable } from "../components/ui/data-table.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";

/** §12 Validación de Inscripciones: revisión y conversión a expediente. */
export function InscripcionesPage() {
  const avisar = useToast();
  const validar = useValidar();
  const [q, setQ] = useState("");
  const [confirmar, setConfirmar] = useState<{ id: string; codigo: string } | null>(null);
  const query = useListarExpedientes({ q, estado: "", orden: "recientes" });
  const pendientes = (query.data?.items ?? []).filter((i) => i.estado === "REGISTRADO");

  async function onValidar(): Promise<void> {
    if (!confirmar) return;
    try {
      await validar.mutateAsync(confirmar.id);
      avisar(`Expediente ${confirmar.codigo} validado (EN_PLAN)`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo validar", "error");
    } finally {
      setConfirmar(null);
    }
  }

  return (
    <AppShell activo="/inscripciones">
      <PageHeader
        titulo="Validación de Inscripciones"
        descripcion="Revisión y conversión a expediente."
      />
      <input
        aria-label="Buscar inscripción"
        className="w-full rounded border bg-white px-3 py-2 text-sm md:max-w-md"
        placeholder="Nombre, DNI o expediente…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <DataTable
        cargando={query.isPending}
        vacio="No existen inscripciones pendientes de validación."
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
          { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
          {
            encabezado: "ACCIÓN",
            celda: (f) => (
              <span className="flex gap-2">
                <Link
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs"
                  to="/expedientes/$id"
                  params={{ id: f.id }}
                >
                  REVISAR
                </Link>
                <button
                  className="rounded bg-verde-inst-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={validar.isPending}
                  onClick={() => setConfirmar({ id: f.id, codigo: f.codigo })}
                  type="button"
                >
                  VALIDAR Y MATRICULAR
                </button>
              </span>
            ),
          },
        ]}
        filas={pendientes}
      />
      {confirmar && (
        <ConfirmDialog
          titulo="Validar inscripción"
          mensaje={`Se creará el expediente formal ${confirmar.codigo} con documentos, etapas y subetapas. Esta acción genera el seguimiento.`}
          confirmar="Validar"
          onConfirmar={() => void onValidar()}
          onCancelar={() => setConfirmar(null)}
        />
      )}
    </AppShell>
  );
}
