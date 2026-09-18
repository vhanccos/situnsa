import { Gavel, ScrollText } from "lucide-react";
import { useState } from "react";
import {
  useCierre,
  useDesignarJurado,
  useDictaminar,
  useProgramarSustentacion,
  useRegistrarActa,
  useRegistrarValidacion,
} from "../../api/seguimiento.js";
import { useSession } from "../../api/session.js";
import { cn } from "../../utils/cn.js";
import { Button } from "../ui/button.js";
import { Card, CardEncabezado } from "../ui/card.js";
import { DataTable } from "../ui/data-table.js";
import { controlClase } from "../ui/field.js";
import { Select } from "../ui/select.js";
import { StatusBadge } from "../ui/status-badge.js";
import { useToast } from "../ui/toast.js";

const INSTANCIAS = [
  "OTI_SIMILITUD",
  "REPOSITORIO",
  "SECRETARIA",
  "COMISION",
  "CONSEJO_FACULTAD",
  "RESOLUCION",
  "SISGRAD",
  "DECANO",
  "GRADOS_TITULOS",
  "CONSEJO_UNIVERSITARIO",
  "COLACION",
  "SUNEDU",
];

/**
 * Cierre del trámite (Oleada D, RF-04…RF-07): jurados + dictamen delegado,
 * sustentación + acta (muta FSM), validaciones por instancia.
 * Solo lectura para tesista/asesor; formularios solo staff.
 */
export function CierreCard({ expedienteId }: { expedienteId: string }) {
  const { sesion } = useSession();
  const avisar = useToast();
  const cierre = useCierre(expedienteId);
  const esStaff = !!sesion && ["ADMIN_FIPS", "SECRETARIA", "DECANO"].includes(sesion.rol);
  const designar = useDesignarJurado(expedienteId);
  const dictaminar = useDictaminar(expedienteId);
  const programar = useProgramarSustentacion(expedienteId);
  const acta = useRegistrarActa(expedienteId);
  const validar = useRegistrarValidacion(expedienteId);

  const [j, setJ] = useState({ dni: "", nombres: "", apellidos: "", grado: "", rol: "VOCAL" });
  const [s, setS] = useState({ fecha: "", hora: "", lugar: "", modalidad: "PRESENCIAL" });
  const [veredicto, setVeredicto] = useState("UNANIMIDAD");
  const [v, setV] = useState({ instancia: "OTI_SIMILITUD", estado: "APROBADO", detalle: "" });
  const [comentario, setComentario] = useState<Record<string, string>>({});

  async function onDesignar(): Promise<void> {
    if (!/^\d{8}$/.test(j.dni) || j.nombres.trim().length < 2 || j.apellidos.trim().length < 2) {
      avisar("DNI 8 dígitos + nombres y apellidos", "error");
      return;
    }
    try {
      await designar.mutateAsync({
        dni: j.dni,
        nombres: j.nombres.trim(),
        apellidos: j.apellidos.trim(),
        ...(j.grado.trim() ? { grado: j.grado.trim() } : {}),
        rol: j.rol,
      });
      setJ({ dni: "", nombres: "", apellidos: "", grado: "", rol: "VOCAL" });
      avisar("Jurado designado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo designar", "error");
    }
  }

  async function onDictaminar(vinculoId: string, dictamen: string): Promise<void> {
    const c = dictamen === "OBSERVADO" ? (comentario[vinculoId] ?? "").trim() : undefined;
    if (dictamen === "OBSERVADO" && !c) {
      avisar("Observar exige un comentario", "error");
      return;
    }
    try {
      await dictaminar.mutateAsync({ vinculoId, dictamen, ...(c ? { comentario: c } : {}) });
      avisar(`Dictamen ${dictamen} registrado`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo dictaminar", "error");
    }
  }

  async function onProgramar(): Promise<void> {
    try {
      await programar.mutateAsync({ ...s, lugar: s.lugar.trim() });
      avisar("Sustentación programada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo programar", "error");
    }
  }

  async function onActa(): Promise<void> {
    try {
      await acta.mutateAsync(veredicto);
      avisar(`Acta registrada: ${veredicto}`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo registrar el acta", "error");
    }
  }

  async function onValidar(): Promise<void> {
    try {
      await validar.mutateAsync({
        instancia: v.instancia,
        estado: v.estado,
        ...(v.detalle.trim() ? { detalle: v.detalle.trim() } : {}),
      });
      avisar(`${v.instancia}: ${v.estado}`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo registrar", "error");
    }
  }

  const datos = cierre.data;
  const tieneActa = !!datos?.sustentacion?.actaVeredicto;
  type JuradoFila = {
    id: string;
    dni: string;
    nombres: string;
    grado: string | null;
    rol: string;
    dictamen: string;
  };

  return (
    <Card>
      <CardEncabezado
        titulo={
          <span className="flex items-center gap-2">
            <Gavel size={16} className="text-navy-800" />
            Cierre del trámite
          </span>
        }
        descripcion="Jurados, sustentación y validaciones institucionales (RF-04…RF-07)."
      />
      <div className="space-y-4 p-4 md:p-5">
        <section>
          <h3 className="mb-2 text-xs font-bold tracking-wider text-grafito-600 uppercase">
            Jurados designados
          </h3>
          <DataTable
            cargando={cierre.isPending}
            vacio="Sin jurados designados."
            columnas={[
              {
                encabezado: "Jurado",
                celda: (x) => (
                  <span>
                    <span className="font-medium">{x.nombres}</span>
                    <br />
                    <span className="text-xs tabular-nums text-grafito-600">
                      DNI {x.dni}
                      {x.grado ? ` · ${x.grado}` : ""}
                    </span>
                  </span>
                ),
              },
              { encabezado: "Rol", celda: (x) => x.rol },
              { encabezado: "Dictamen", celda: (x) => <StatusBadge estado={x.dictamen} /> },
              ...(esStaff
                ? [
                    {
                      encabezado: "Acción",
                      celda: (x: JuradoFila) =>
                        x.dictamen === "PENDIENTE" ? (
                          <span className="flex flex-wrap items-center gap-1.5">
                            <Button
                              tamano="xs"
                              variante="exito"
                              disabled={dictaminar.isPending}
                              onClick={() => void onDictaminar(x.id, "FAVORABLE")}
                              type="button"
                            >
                              Favorable
                            </Button>
                            <input
                              aria-label={`Comentario para ${x.nombres}`}
                              className={cn(controlClase, "h-7 max-w-40 text-xs")}
                              placeholder="Motivo si observa…"
                              value={comentario[x.id] ?? ""}
                              onChange={(e) =>
                                setComentario((p) => ({ ...p, [x.id]: e.target.value }))
                              }
                            />
                            <Button
                              tamano="xs"
                              variante="contorno"
                              disabled={dictaminar.isPending}
                              onClick={() => void onDictaminar(x.id, "OBSERVADO")}
                              type="button"
                            >
                              Observar
                            </Button>
                          </span>
                        ) : (
                          <span className="text-xs text-grafito-600">—</span>
                        ),
                    },
                  ]
                : []),
            ]}
            filas={(datos?.jurados ?? []).map((x) => ({ ...x }))}
          />
          {esStaff && (
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[110px_1fr_1fr_90px_130px_auto]">
              <input
                aria-label="DNI del jurado"
                className={cn(controlClase, "h-9")}
                placeholder="DNI"
                value={j.dni}
                onChange={(e) => setJ({ ...j, dni: e.target.value })}
              />
              <input
                aria-label="Nombres"
                className={cn(controlClase, "h-9")}
                placeholder="Nombres"
                value={j.nombres}
                onChange={(e) => setJ({ ...j, nombres: e.target.value })}
              />
              <input
                aria-label="Apellidos"
                className={cn(controlClase, "h-9")}
                placeholder="Apellidos"
                value={j.apellidos}
                onChange={(e) => setJ({ ...j, apellidos: e.target.value })}
              />
              <input
                aria-label="Grado"
                className={cn(controlClase, "h-9")}
                placeholder="Grado"
                value={j.grado}
                onChange={(e) => setJ({ ...j, grado: e.target.value })}
              />
              <Select ariaLabel="Rol" value={j.rol} onChange={(rol) => setJ({ ...j, rol })}>
                {["PRESIDENTE", "SECRETARIO", "VOCAL", "SUPLENTE"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
              <Button
                variante="contorno"
                disabled={designar.isPending}
                onClick={() => void onDesignar()}
                type="button"
              >
                Designar
              </Button>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-grafito-600 uppercase">
            <ScrollText size={14} />
            Sustentación y acta
          </h3>
          {datos?.sustentacion ? (
            <p className="rounded-lg bg-slate-100/70 px-3 py-2 text-sm">
              {datos.sustentacion.fecha} · {datos.sustentacion.hora} · {datos.sustentacion.lugar} ·{" "}
              {datos.sustentacion.modalidad}
              {datos.sustentacion.actaVeredicto && (
                <strong> · Acta: {datos.sustentacion.actaVeredicto}</strong>
              )}
            </p>
          ) : (
            <p className="text-sm text-grafito-600">
              {cierre.isPending ? "Cargando…" : "Sin programar."}
            </p>
          )}
          {esStaff && !tieneActa && (
            <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-[130px_100px_1fr_130px_auto_auto]">
              <input
                aria-label="Fecha"
                className={cn(controlClase, "h-9")}
                placeholder="AAAA-MM-DD"
                value={s.fecha}
                onChange={(e) => setS({ ...s, fecha: e.target.value })}
              />
              <input
                aria-label="Hora"
                className={cn(controlClase, "h-9")}
                placeholder="10:00"
                value={s.hora}
                onChange={(e) => setS({ ...s, hora: e.target.value })}
              />
              <input
                aria-label="Lugar"
                className={cn(controlClase, "h-9")}
                placeholder="Auditorio FIPS"
                value={s.lugar}
                onChange={(e) => setS({ ...s, lugar: e.target.value })}
              />
              <Select
                ariaLabel="Modalidad"
                value={s.modalidad}
                onChange={(modalidad) => setS({ ...s, modalidad })}
              >
                <option value="PRESENCIAL">PRESENCIAL</option>
                <option value="VIRTUAL">VIRTUAL</option>
              </Select>
              <Button
                variante="contorno"
                disabled={programar.isPending}
                onClick={() => void onProgramar()}
                type="button"
              >
                Programar
              </Button>
              <span className="flex gap-2">
                <Select ariaLabel="Veredicto" value={veredicto} onChange={setVeredicto}>
                  {["FELICITACION", "UNANIMIDAD", "MAYORIA", "DESAPROBACION"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </Select>
                <Button
                  variante="oscuro"
                  disabled={acta.isPending || !datos?.sustentacion}
                  onClick={() => void onActa()}
                  type="button"
                >
                  Acta
                </Button>
              </span>
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold tracking-wider text-grafito-600 uppercase">
            Validaciones institucionales
          </h3>
          <DataTable
            cargando={cierre.isPending}
            vacio="Sin validaciones registradas."
            columnas={[
              { encabezado: "Instancia", celda: (x) => x.instancia.replace(/_/g, " ") },
              { encabezado: "Estado", celda: (x) => <StatusBadge estado={x.estado} /> },
              {
                encabezado: "Detalle",
                celda: (x) => <span className="text-xs">{x.detalle ?? "—"}</span>,
              },
            ]}
            filas={(datos?.validaciones ?? []).map((x) => ({ ...x }))}
          />
          {esStaff && (
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[220px_160px_1fr_auto]">
              <Select
                ariaLabel="Instancia"
                value={v.instancia}
                onChange={(instancia) => setV({ ...v, instancia })}
              >
                {INSTANCIAS.map((i) => (
                  <option key={i} value={i}>
                    {i.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
              <Select
                ariaLabel="Estado"
                value={v.estado}
                onChange={(estado) => setV({ ...v, estado })}
              >
                {["PENDIENTE", "APROBADO", "OBSERVADO"].map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
              <input
                aria-label="Detalle"
                className={cn(controlClase, "h-9")}
                placeholder="Detalle (opcional)"
                value={v.detalle}
                onChange={(e) => setV({ ...v, detalle: e.target.value })}
              />
              <Button
                variante="contorno"
                disabled={validar.isPending}
                onClick={() => void onValidar()}
                type="button"
              >
                Registrar
              </Button>
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}
