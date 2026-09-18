import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { useListarExpedientes, useValidar } from "../api/expedientes.js";
import { useObservar } from "../api/seguimiento.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button, botonClases } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { ConfirmDialog } from "../components/ui/confirm-dialog.js";
import { DataTable } from "../components/ui/data-table.js";
import { Dialogo } from "../components/ui/dialog.js";
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
  const observar = useObservar();
  const [observada, setObservada] = useState<{ id: string; codigo: string } | null>(null);
  const [motivo, setMotivo] = useState("");
  const pendientes = (query.data?.items ?? []).filter(
    (i) => i.estado === "REGISTRADO" || i.estado === "OBSERVADO",
  );

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

  async function onObservar(): Promise<void> {
    if (!observada || motivo.trim().length < 5) {
      avisar("El motivo requiere 5 caracteres mínimo", "error");
      return;
    }
    try {
      await observar.mutateAsync({ id: observada.id, motivo: motivo.trim() });
      avisar(`Expediente ${observada.codigo} observado`);
      setObservada(null);
      setMotivo("");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo observar", "error");
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
                    {(f.estado === "REGISTRADO" || f.estado === "OBSERVADO") && (
                      <>
                        <Button
                          tamano="sm"
                          variante="exito"
                          disabled={validar.isPending}
                          onClick={() => setConfirmar({ id: f.id, codigo: f.codigo })}
                          type="button"
                        >
                          VALIDAR Y MATRICULAR
                        </Button>
                        <Button
                          tamano="sm"
                          variante="contorno"
                          disabled={observar.isPending}
                          onClick={() => {
                            setMotivo("");
                            setObservada({ id: f.id, codigo: f.codigo });
                          }}
                          type="button"
                        >
                          OBSERVAR
                        </Button>
                      </>
                    )}
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
      {observada && (
        <Dialogo
          abierto
          onAbierto={(v) => {
            if (!v) setObservada(null);
          }}
          titulo={`Observar ${observada.codigo}`}
          descripcion="El motivo queda como mensaje visible al tesista (mínimo 5 caracteres)."
        >
          <textarea
            aria-label="Motivo de la observación"
            className={cn(controlClase, "min-h-24")}
            placeholder="Indique qué falta o qué debe corregir…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button variante="contorno" onClick={() => setObservada(null)} type="button">
              Cancelar
            </Button>
            <Button
              variante="oscuro"
              disabled={observar.isPending || motivo.trim().length < 5}
              onClick={() => void onObservar()}
              type="button"
            >
              {observar.isPending ? "Observando…" : "Observar"}
            </Button>
          </div>
        </Dialogo>
      )}
    </AppShell>
  );
}
