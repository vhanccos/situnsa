import type { ExpedienteDetalleDTO } from "@pis/contracts";
import { Check, Lock, MessageSquareText, Printer, Send } from "lucide-react";
import { useState } from "react";
import { usePublicarMensaje } from "../../api/expedientes.js";
import { useFinalizarSubetapa } from "../../api/seguimiento.js";
import { useSession } from "../../api/session.js";
import { cn } from "../../utils/cn.js";
import { Button } from "../ui/button.js";
import { Card, CardEncabezado } from "../ui/card.js";
import { DataTable } from "../ui/data-table.js";
import { controlClase } from "../ui/field.js";
import { StatusBadge } from "../ui/status-badge.js";
import { useToast } from "../ui/toast.js";

/** Tab Resumen §9 (datos 100% del backend: subetapas + avance + mensajes). */
export function ResumenTab({ detalle }: { detalle: ExpedienteDetalleDTO }) {
  const { sesion } = useSession();
  const avisar = useToast();
  const [texto, setTexto] = useState("");
  const [etapaSel, setEtapaSel] = useState<number | null>(detalle.avance.etapaActual);
  const publicar = usePublicarMensaje(detalle.id);
  const puedePublicar = sesion && sesion.rol !== "TESISTA";
  // RN-08: solo el responsable (staff) cierra subetapas.
  const puedeFinalizar = !!sesion && ["ADMIN_FIPS", "SECRETARIA", "DECANO"].includes(sesion.rol);
  const finalizar = useFinalizarSubetapa(detalle.id);

  async function onFinalizar(subetapaId: string): Promise<void> {
    try {
      const r = await finalizar.mutateAsync(subetapaId);
      avisar(
        r.siguienteId
          ? `Subetapa finalizada; habilitada la siguiente`
          : "Subetapa finalizada (etapa completa)",
      );
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo finalizar", "error");
    }
  }

  const porEtapa = new Map<number, typeof detalle.subetapas>();
  for (const s of detalle.subetapas) {
    const arr = porEtapa.get(s.etapa) ?? [];
    arr.push(s);
    porEtapa.set(s.etapa, arr);
  }
  const etapas = [...porEtapa.keys()].sort((a, b) => a - b);
  const nombreEtapa = (etapa: number): string =>
    porEtapa.get(etapa)?.[0]?.etapaNombre ?? `Etapa ${etapa}`;
  const pctEtapa = (etapa: number): number => {
    const subs = porEtapa.get(etapa) ?? [];
    if (subs.length === 0) return 0;
    return Math.round((subs.filter((s) => s.estado === "FINALIZADO").length / subs.length) * 100);
  };
  const hechosEtapa = (etapa: number): number =>
    (porEtapa.get(etapa) ?? []).filter((s) => s.estado === "FINALIZADO").length;

  const subsSel = etapaSel === null ? detalle.subetapas : (porEtapa.get(etapaSel) ?? []);
  const filasHistorial = (
    etapaSel === null ? detalle.subetapas : detalle.subetapas.filter((s) => s.etapa === etapaSel)
  ).map((s, i) => ({ ...s, id: `${s.etapa}-${s.orden}-${i}` }));

  async function enviar(): Promise<void> {
    if (!texto.trim()) return;
    try {
      await publicar.mutateAsync(texto.trim());
      setTexto("");
      avisar("Mensaje publicado");
    } catch {
      avisar("No se pudo publicar", "error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="no-imprimir flex items-center justify-end print:hidden">
        <Button tamano="sm" variante="contorno" onClick={() => window.print()} type="button">
          <Printer size={14} />
          Imprimir ficha
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-5">
          <p className="text-4xl font-bold tabular-nums text-navy-950">{detalle.avance.pct}%</p>
          <div className="min-w-48 flex-1">
            <p className="text-sm font-bold text-navy-950">Avance general del expediente</p>
            <p className="text-xs text-grafito-600">
              {detalle.avance.marcados} de {detalle.avance.total} subetapas ·{" "}
              {detalle.avance.subetapaActual ?? "Sin seguimiento"}
            </p>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200"
              role="progressbar"
              aria-valuenow={detalle.avance.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-navy-800 to-verde-inst-700"
                style={{ width: `${detalle.avance.pct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardEncabezado
            titulo="Etapas del trámite"
            descripcion="Selecciona para ver el detalle"
          />
          <ol className="relative space-y-0.5 p-2">
            {etapas.map((numero) => {
              const pct = pctEtapa(numero);
              const completa = pct === 100;
              const actual = numero === detalle.avance.etapaActual;
              const sel = etapaSel === numero;
              return (
                <li key={numero}>
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                      sel ? "bg-navy-950/[0.06]" : "hover:bg-slate-50",
                    )}
                    onClick={() => setEtapaSel(sel ? null : numero)}
                    type="button"
                    aria-pressed={sel}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        completa
                          ? "bg-verde-inst-700 text-white"
                          : actual
                            ? "bg-dorado-500 text-navy-950 ring-2 ring-dorado-500/40 ring-offset-1"
                            : "bg-slate-200 text-grafito-600",
                      )}
                      aria-hidden
                    >
                      {completa ? <Check size={15} /> : numero}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-navy-950">
                        {numero}. {nombreEtapa(numero)}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <span
                            className={cn(
                              "block h-full rounded-full",
                              completa ? "bg-verde-inst-700" : "bg-dorado-500",
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-grafito-600">
                          {hechosEtapa(numero)}/{(porEtapa.get(numero) ?? []).length}
                        </span>
                      </span>
                    </span>
                    {actual && !completa && (
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-dorado-500" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card className="min-w-0">
          <CardEncabezado
            titulo={
              etapaSel === null
                ? "Detalle de todas las etapas"
                : `Etapa ${etapaSel}. ${nombreEtapa(etapaSel)}`
            }
            descripcion={
              etapaSel === null
                ? `${detalle.subetapas.length} subetapas`
                : `${hechosEtapa(etapaSel)} de ${(porEtapa.get(etapaSel) ?? []).length} finalizadas`
            }
            accion={
              etapaSel !== null && (
                <button
                  className="text-xs font-semibold text-navy-800 hover:underline"
                  onClick={() => setEtapaSel(null)}
                  type="button"
                >
                  Ver todas
                </button>
              )
            }
          />
          <ol className="divide-y divide-slate-200/70 px-4 md:px-5">
            {subsSel.map((s) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-sm"
                key={`${s.etapa}.${s.orden}`}
              >
                <span className="min-w-0">
                  <strong className="tabular-nums">
                    {s.etapa}.{s.orden}
                  </strong>{" "}
                  {s.nombre}
                  <span className="text-xs text-grafito-600"> · {s.plazo ?? "sin plazo"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-grafito-600">
                  {s.responsable ? <span>{s.responsable}</span> : null}
                  {s.fin ? (
                    <span>Fin {new Date(s.fin).toLocaleDateString("es-PE")}</span>
                  ) : s.inicio ? (
                    <span>Inicio {new Date(s.inicio).toLocaleDateString("es-PE")}</span>
                  ) : null}
                  <StatusBadge estado={s.estado} />
                  {puedeFinalizar && s.estado === "EN_CURSO" && (
                    <Button
                      tamano="xs"
                      variante="exito"
                      disabled={finalizar.isPending}
                      onClick={() => void onFinalizar(s.id)}
                      type="button"
                    >
                      Finalizar
                    </Button>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <CardEncabezado
          titulo="Historial del expediente"
          descripcion={
            etapaSel === null
              ? "Todas las subetapas"
              : `Filtrado: Etapa ${etapaSel} (clic en la etapa para quitar el filtro)`
          }
        />
        <div className="p-4 md:p-5">
          <DataTable
            vacio="No existen subetapas."
            columnas={[
              { encabezado: "Etapa", celda: (f) => `Etapa ${f.etapa}` },
              { encabezado: "Subetapa", celda: (f) => `${f.orden}. ${f.nombre}` },
              { encabezado: "Responsable", celda: (f) => f.responsable ?? "—" },
              {
                encabezado: "Inicio",
                celda: (f) => (f.inicio ? new Date(f.inicio).toLocaleDateString("es-PE") : "—"),
              },
              {
                encabezado: "Fin",
                celda: (f) => (f.fin ? new Date(f.fin).toLocaleDateString("es-PE") : "—"),
              },
              { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
            ]}
            filas={filasHistorial}
          />
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="h-fit">
          <CardEncabezado
            titulo={
              <span className="flex items-center gap-2">
                <MessageSquareText size={16} className="text-navy-800" />
                Mensajes
              </span>
            }
            descripcion="Comunicación con el tesista"
          />
          <div className="space-y-2 p-4 md:px-5">
            {detalle.mensajes.length === 0 && (
              <p className="text-sm text-grafito-600">Sin mensajes.</p>
            )}
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {detalle.mensajes.map((m) => (
                <li
                  className="rounded-lg border-l-4 border-l-dorado-500 bg-slate-50 px-3 py-2"
                  key={m.id}
                >
                  <p className="text-sm">{m.texto}</p>
                  <p className="mt-0.5 text-xs text-grafito-600">
                    {new Date(m.createdAt).toLocaleString("es-PE")}
                    {m.autorDni ? ` · DNI ${m.autorDni}` : ""}
                  </p>
                </li>
              ))}
            </ul>
            {puedePublicar && (
              <div className="no-imprimir flex gap-2 print:hidden">
                <input
                  aria-label="Nuevo mensaje"
                  className={cn(controlClase, "h-10 flex-1")}
                  placeholder="Escriba el mensaje que visualizará el tesista…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                />
                <Button
                  variante="oscuro"
                  disabled={publicar.isPending || !texto.trim()}
                  onClick={() => void enviar()}
                  type="button"
                >
                  <Send size={15} />
                  Enviar
                </Button>
              </div>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <CardEncabezado
            titulo={
              <span className="flex items-center gap-2">
                <Lock size={15} className="text-navy-800" />
                Cadena de custodia
              </span>
            }
            descripcion="Transiciones firmadas del expediente"
          />
          <ol className="relative space-y-3 p-4 pl-6 md:px-5 md:pl-7">
            <span
              className="absolute top-4 bottom-4 left-[9px] w-px bg-slate-300 md:left-[13px]"
              aria-hidden
            />
            {detalle.historial.map((h, i) => (
              <li className="relative text-sm" key={`${h.createdAt}-${i}`}>
                <span
                  className="absolute top-1.5 -left-4 h-2.5 w-2.5 rounded-full border-2 border-navy-800 bg-white md:-left-4.5"
                  aria-hidden
                />
                <p>
                  {h.estadoAnterior ? (
                    <span className="text-grafito-600">{h.estadoAnterior} → </span>
                  ) : null}
                  <strong className="text-navy-950">{h.estadoNuevo}</strong>
                  {h.actorDni ? (
                    <span className="text-grafito-600"> · DNI {h.actorDni}</span>
                  ) : null}
                </p>
                <p className="text-xs tabular-nums text-grafito-600">
                  {new Date(h.createdAt).toLocaleString("es-PE")}
                </p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
