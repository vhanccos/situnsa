import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { useListarExpedientes, useValidar } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button, botonClases } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { ConfirmDialog } from "../components/ui/confirm-dialog.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

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
      <Card>
        <CardEncabezado
          titulo="Inscripciones por validar"
          descripcion="Revisa y convierte a expediente formal."
          tira
          accion={
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
              {pendientes.length} pendientes
            </span>
          }
        />
        <div className="space-y-3 p-4 md:p-5">
          <div className="relative md:max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grafito-600"
              aria-hidden
            />
            <input
              aria-label="Buscar inscripción"
              className={cn(controlClase, "h-9 pl-9")}
              placeholder="Nombre, DNI o expediente…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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
              {
                encabezado: "PROGRAMA",
                celda: (f) => <span className="text-xs">{f.programa}</span>,
              },
              { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
              {
                encabezado: "ACCIÓN",
                celda: (f) => (
                  <span className="flex gap-2">
                    <Link
                      className={cn(botonClases({ variante: "contorno", tamano: "sm" }))}
                      to="/expedientes/$id"
                      params={{ id: f.id }}
                    >
                      REVISAR
                    </Link>
                    <Button
                      tamano="sm"
                      variante="exito"
                      disabled={validar.isPending}
                      onClick={() => setConfirmar({ id: f.id, codigo: f.codigo })}
                      type="button"
                    >
                      VALIDAR Y MATRICULAR
                    </Button>
                  </span>
                ),
              },
            ]}
            filas={pendientes}
          />
        </div>
      </Card>
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
