import type { ExpedienteDetalleDTO } from "@pis/contracts";
import { FLUJO_TITULACION } from "@pis/domain/dist/expediente/seguimiento-catalogo.js";
import { useState } from "react";
import { usePublicarMensaje } from "../../api/expedientes.js";
import { useSession } from "../../api/session.js";
import { cn } from "../../utils/cn.js";
import { DataTable } from "../ui/data-table.js";
import { StatusBadge } from "../ui/status-badge.js";
import { useToast } from "../ui/toast.js";

const NOMBRES_ETAPA: Record<number, string> = Object.fromEntries(
  FLUJO_TITULACION.map((e) => [e.numero, e.nombre]),
);

/** Tab Resumen §9: 7 etapas + acordeones + historial + mensajes. */
export function ResumenTab({ detalle }: { detalle: ExpedienteDetalleDTO }) {
  const { sesion } = useSession();
  const avisar = useToast();
  const [texto, setTexto] = useState("");
  const publicar = usePublicarMensaje(detalle.id);
  const puedePublicar = sesion && sesion.rol !== "TESISTA";
  const porEtapa = new Map<number, typeof detalle.subetapas>();
  for (const s of detalle.subetapas) {
    const arr = porEtapa.get(s.etapa) ?? [];
    arr.push(s);
    porEtapa.set(s.etapa, arr);
  }
  const pctEtapa = (etapa: number): number => {
    const subs = porEtapa.get(etapa) ?? [];
    if (subs.length === 0) return 0;
    return Math.round((subs.filter((s) => s.estado === "FINALIZADO").length / subs.length) * 100);
  };

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
    <div className="space-y-5">
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Progreso del trámite</h2>
          <p className="text-sm font-bold">
            Avance general del expediente · {detalle.avance.marcados} de {detalle.avance.total}{" "}
            subetapas · {detalle.avance.pct}%
          </p>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-7">
          {FLUJO_TITULACION.map((e) => {
            const activa = e.numero === detalle.avance.etapaActual;
            return (
              <div
                className={cn(
                  "rounded-lg border p-2 text-center",
                  activa ? "border-dorado-500 bg-aviso-100" : "bg-white",
                )}
                key={e.numero}
              >
                <p className="text-lg font-bold text-navy-950">{e.numero}</p>
                <p className="min-h-8 text-[11px] leading-tight">{e.nombre}</p>
                <p className="mt-1 text-xs font-bold">{pctEtapa(e.numero)}%</p>
                <StatusBadge
                  estado={
                    pctEtapa(e.numero) === 100 ? "FINALIZADO" : activa ? "EN_CURSO" : "NO_INICIADO"
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">Etapas del expediente</h2>
        <div className="mt-2 space-y-2">
          {[1, 2, 3, 4, 5, 6, 7].map((etapa) => {
            const subs = porEtapa.get(etapa) ?? [];
            return (
              <details
                className="rounded-lg border bg-white"
                key={etapa}
                open={etapa === detalle.avance.etapaActual}
              >
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">
                  {etapa}. {NOMBRES_ETAPA[etapa]} —{" "}
                  {subs.filter((s) => s.estado === "FINALIZADO").length}/{subs.length}
                </summary>
                <ol className="space-y-1 border-t px-3 py-2">
                  {subs.map((s) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm"
                      key={`${s.etapa}.${s.orden}`}
                    >
                      <span>
                        <strong>
                          {s.etapa}.{s.orden}
                        </strong>{" "}
                        {s.nombre}
                        <span className="text-xs text-grafito-600"> · {s.plazo ?? "—"}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-grafito-600">
                        {s.responsable ? <span>{s.responsable}</span> : null}
                        {s.inicio ? (
                          <span>Inicio {new Date(s.inicio).toLocaleDateString("es-PE")}</span>
                        ) : null}
                        {s.fin ? (
                          <span>Fin {new Date(s.fin).toLocaleDateString("es-PE")}</span>
                        ) : null}
                        <StatusBadge estado={s.estado} />
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">Historial del expediente</h2>
        <div className="mt-2">
          <DataTable
            vacio="No existen subetapas."
            columnas={[
              { encabezado: "ETAPA", celda: (f) => `Etapa ${f.etapa}` },
              { encabezado: "SUBETAPA", celda: (f) => `${f.orden}. ${f.nombre}` },
              { encabezado: "RESPONSABLE", celda: (f) => f.responsable ?? "—" },
              {
                encabezado: "INICIO",
                celda: (f) => (f.inicio ? new Date(f.inicio).toLocaleDateString("es-PE") : "—"),
              },
              {
                encabezado: "FIN",
                celda: (f) => (f.fin ? new Date(f.fin).toLocaleDateString("es-PE") : "—"),
              },
              { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
            ]}
            filas={detalle.subetapas.map((s, i) => ({ ...s, id: `${s.etapa}-${s.orden}-${i}` }))}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold">Historial de mensajes</h2>
        {detalle.mensajes.length === 0 && (
          <p className="mt-1 text-sm text-grafito-600">Sin mensajes.</p>
        )}
        <ul className="mt-2 space-y-2">
          {detalle.mensajes.map((m) => (
            <li className="rounded border-l-4 border-l-dorado-500 bg-white px-3 py-2" key={m.id}>
              <p className="text-sm">{m.texto}</p>
              <p className="text-xs text-grafito-600">
                {new Date(m.createdAt).toLocaleString("es-PE")}
                {m.autorDni ? ` · DNI ${m.autorDni}` : ""}
              </p>
            </li>
          ))}
        </ul>
        {puedePublicar && (
          <div className="mt-2 flex gap-2">
            <input
              aria-label="Nuevo mensaje"
              className="flex-1 rounded border px-3 py-2 text-sm"
              placeholder="Escriba el mensaje que visualizará el tesista…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            <button
              className="rounded bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={publicar.isPending || !texto.trim()}
              onClick={() => void enviar()}
              type="button"
            >
              ENVIAR MENSAJE
            </button>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-bold">Cadena de custodia</h2>
        <ol className="mt-1 space-y-1">
          {detalle.historial.map((h, i) => (
            <li className="text-sm" key={`${h.createdAt}-${i}`}>
              <span className="text-grafito-600">
                {new Date(h.createdAt).toLocaleString("es-PE")}
              </span>{" "}
              — {h.estadoAnterior ? `${h.estadoAnterior} → ` : ""}
              <strong>{h.estadoNuevo}</strong>
              {h.actorDni ? ` (DNI ${h.actorDni})` : ""}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
