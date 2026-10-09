import { useState } from "react";
import { useCuotas, useGrupos, useProgramarPensiones } from "../api/catalogos.js";
import { abrirArchivoProtegido } from "../api/expedientes.js";
import {
  atrasoTexto,
  comprobanteUrl,
  diaMes,
  fechaCorta,
  useDeudoresTaller,
  useObservarComprobante,
  useTalleres,
  useValidarComprobante,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

/** P9 Pagos del taller: cronograma, comprobantes y deudores (Secretaría). */
export function PagosTallerPage() {
  const talleres = useTalleres({});
  const [tallerId, setTallerId] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [tab, setTab] = useState("comprobantes");
  const grupos = useGrupos();
  const gruposDelTaller = (grupos.data ?? []).filter((g) => !tallerId || g.tallerId === tallerId);
  const [grupoId, setGrupoId] = useState("");
  const grupoSel = grupoId || gruposDelTaller[0]?.id || null;

  return (
    <AppShell activo="/pagos-taller">
      <PageHeader titulo="Pagos del taller" descripcion="RF-0211, RF-0215, RF-0216" />
      <Card>
        <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-3 md:p-5">
          <Select label="TALLER" value={tallerId} onChange={setTallerId}>
            <option value="">Todos</option>
            {(talleres.data?.items ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Select>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold tracking-wider text-grafito-600 uppercase">
              Período
            </span>
            <input
              aria-label="Filtrar por período"
              className={cn(controlClase, "h-9")}
              placeholder="Todos"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </label>
          <Select label="GRUPO" value={grupoSel ?? ""} onChange={setGrupoId}>
            <option value="">Primero de la lista</option>
            {gruposDelTaller.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre} · {g.tallerNombre}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones de pagos">
        {(
          [
            ["cronograma", "Cronograma"],
            ["comprobantes", "Comprobantes por validar"],
            ["deudores", "Deudores"],
          ] as Array<[string, string]>
        ).map(([v, etiqueta]) => (
          <Button
            key={v}
            tamano="sm"
            variante={tab === v ? "oscuro" : "contorno"}
            onClick={() => setTab(v)}
            type="button"
          >
            {etiqueta}
          </Button>
        ))}
      </div>
      <div className="pt-1">
        {tab === "cronograma" &&
          (grupoSel ? (
            <CronogramaGrupo grupoId={grupoSel} />
          ) : (
            <Card>
              <div className="p-4 text-sm text-grafito-600">
                Elige un grupo para programar su cronograma.
              </div>
            </Card>
          ))}
        {tab === "comprobantes" &&
          (grupoSel ? (
            <ComprobantesGrupo
              grupoId={grupoSel}
              tallerNombre={gruposDelTaller.find((g) => g.id === grupoSel)?.tallerNombre ?? ""}
            />
          ) : (
            <Card>
              <div className="p-4 text-sm text-grafito-600">
                Elige un grupo para revisar comprobantes.
              </div>
            </Card>
          ))}
        {tab === "deudores" && <DeudoresPanel tallerId={tallerId} periodo={periodo} />}
      </div>
    </AppShell>
  );
}

function CronogramaGrupo({ grupoId }: { grupoId: string }) {
  const avisar = useToast();
  const grupos = useGrupos();
  const cuotas = useCuotas(grupoId);
  const programar = useProgramarPensiones();
  const [nro, setNro] = useState("");
  const [monto, setMonto] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const grupo = (grupos.data ?? []).find((g) => g.id === grupoId);
  const filas = cuotas.data ?? [];

  async function onProgramar(): Promise<void> {
    try {
      const r = await programar.mutateAsync({
        grupoId,
        nroCuotas: Number(nro),
        monto: Number(monto),
        primerVencimiento: vencimiento,
      });
      setNro("");
      setMonto("");
      setVencimiento("");
      avisar(`Cronograma: ${r.cuotas} cuotas para ${r.miembros} miembros`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo programar", "error");
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardEncabezado
          titulo={`Cronograma · ${grupo?.nombre ?? ""}`}
          descripcion="Todos los miembros comparten el calendario; el cumplimiento se controla por alumno."
        />
        <div className="flex flex-wrap gap-2 p-4">
          <input
            aria-label="Número de cuotas"
            type="number"
            min={1}
            max={24}
            className={cn(controlClase, "h-9 max-w-28")}
            placeholder="Cuotas"
            value={nro}
            onChange={(e) => setNro(e.target.value)}
          />
          <input
            aria-label="Monto por cuota S/"
            type="number"
            min={1}
            className={cn(controlClase, "h-9 max-w-28")}
            placeholder="S/"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />
          <input
            aria-label="Primer vencimiento"
            type="date"
            className={cn(controlClase, "h-9 max-w-44")}
            value={vencimiento}
            onChange={(e) => setVencimiento(e.target.value)}
          />
          <Button
            tamano="sm"
            variante="oscuro"
            disabled={programar.isPending}
            onClick={() => void onProgramar()}
            type="button"
          >
            Programar
          </Button>
        </div>
      </Card>
      <Card>
        <CardEncabezado titulo="Cuotas del grupo" />
        <div className="p-4">
          <DataTable
            cargando={cuotas.isPending}
            vacio="Sin cronograma: programa las pensiones primero."
            columnas={[
              { encabezado: "Tesista", celda: (c) => `${c.nombres} · ${c.usuarioDni}` },
              { encabezado: "Cuota", celda: (c) => `N° ${c.nroCuota}` },
              { encabezado: "Monto", celda: (c) => `S/ ${c.monto}` },
              { encabezado: "Vence", celda: (c) => fechaCorta(c.vencimiento) },
            ]}
            filas={filas}
          />
        </div>
      </Card>
    </div>
  );
}

function DeudoresPanel({ tallerId, periodo }: { tallerId: string; periodo: string }) {
  const deudores = useDeudoresTaller(tallerId || undefined, periodo.trim() || undefined);
  const items = deudores.data?.items ?? [];
  const filas = items
    .flatMap((d) =>
      d.cuotas.map((c) => ({
        id: `${d.usuarioId}|${c.nroCuota}`,
        nombres: d.nombres,
        tallerNombre: d.tallerNombre,
        nroCuota: c.nroCuota,
        monto: c.monto,
        vencimiento: c.vencimiento,
      })),
    )
    .sort((a, b) => b.vencimiento.localeCompare(a.vencimiento));
  const nDeudores = new Set(items.map((d) => d.usuarioId)).size;

  return (
    <Card>
      <CardEncabezado
        titulo="Deudores"
        accion={
          <span className="inline-flex items-center rounded-full border border-red-300 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
            {nDeudores === 1 ? "1 deudor" : `${nDeudores} deudores`}
          </span>
        }
      />
      <div className="p-4">
        <DataTable
          cargando={deudores.isPending}
          vacio="Sin deudores con estos filtros."
          columnas={[
            { encabezado: "Alumno", celda: (f) => f.nombres },
            { encabezado: "Taller", celda: (f) => f.tallerNombre },
            { encabezado: "Cuota", celda: (f) => f.nroCuota },
            { encabezado: "Monto", celda: (f) => `S/ ${f.monto.toFixed(2)}` },
            { encabezado: "Atraso", celda: (f) => atrasoTexto(f.vencimiento) },
          ]}
          filas={filas}
        />
        <p className="mt-2 text-xs text-grafito-600">Filtros nuevos: por taller y por período.</p>
      </div>
    </Card>
  );
}

function ComprobantesGrupo({ grupoId, tallerNombre }: { grupoId: string; tallerNombre: string }) {
  const avisar = useToast();
  const cuotas = useCuotas(grupoId);
  const validar = useValidarComprobante();
  const observar = useObservarComprobante();
  const [obsDe, setObsDe] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const filas = (cuotas.data ?? []).filter((c) => c.estado === "EN_REVISION");

  async function onVer(cuotaId: string): Promise<void> {
    try {
      await abrirArchivoProtegido(comprobanteUrl(cuotaId));
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo abrir", "error");
    }
  }

  async function onValidar(cuotaId: string): Promise<void> {
    try {
      await validar.mutateAsync(cuotaId);
      avisar("Comprobante validado: la cuota queda pagada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo validar", "error");
    }
  }

  async function onObservar(cuotaId: string): Promise<void> {
    if (motivo.trim().length < 5) {
      avisar("El motivo es obligatorio (mínimo 5 letras)", "error");
      return;
    }
    try {
      await observar.mutateAsync({ cuotaId, motivo: motivo.trim() });
      setObsDe(null);
      setMotivo("");
      avisar("Comprobante observado: vuelve al alumno");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo observar", "error");
    }
  }

  return (
    <Card>
      <CardEncabezado titulo="Comprobantes por validar" />
      <div className="p-4">
        <DataTable
          cargando={cuotas.isPending}
          vacio="Sin comprobantes en revisión en este grupo."
          columnas={[
            { encabezado: "Alumno", celda: (f) => f.nombres },
            { encabezado: "Taller", celda: (f) => f.tallerNombre },
            { encabezado: "Cuota", celda: (f) => f.nroCuota },
            {
              encabezado: "Archivo",
              celda: (f) => (
                <button
                  className="text-sm text-grafito-700 underline"
                  onClick={() => void onVer(f.id)}
                  type="button"
                >
                  Ver archivo
                </button>
              ),
            },
            {
              encabezado: "Fecha",
              celda: (f) => (f.comprobanteFecha ? diaMes(f.comprobanteFecha) : "—"),
            },
            {
              encabezado: "Acciones",
              celda: (f) => (
                <span className="flex flex-wrap items-center gap-1">
                  <Button
                    tamano="sm"
                    variante="exito"
                    disabled={validar.isPending}
                    onClick={() => void onValidar(f.id)}
                    type="button"
                  >
                    Validar
                  </Button>
                  <Button
                    tamano="sm"
                    variante="contorno"
                    onClick={() => {
                      setObsDe(obsDe === f.id ? null : f.id);
                      setMotivo("");
                    }}
                    type="button"
                  >
                    Observar
                  </Button>
                  {obsDe === f.id && (
                    <span className="flex items-center gap-1">
                      <input
                        aria-label={`Motivo para ${f.nombres} cuota ${f.nroCuota}`}
                        className={cn(controlClase, "h-8 max-w-44")}
                        placeholder="Motivo…"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                      <Button
                        tamano="xs"
                        variante="oscuro"
                        disabled={observar.isPending}
                        onClick={() => void onObservar(f.id)}
                        type="button"
                      >
                        Confirmar
                      </Button>
                    </span>
                  )}
                </span>
              ),
            },
          ]}
          filas={filas.map((f) => ({ ...f, tallerNombre }))}
        />
        <p className="mt-2 text-xs text-grafito-600">
          Observar pide un motivo. Al validar, la cuota queda pagada, se actualiza Deudores y se
          avisa al alumno.
        </p>
      </div>
    </Card>
  );
}
