import { useState } from "react";
import { useAgregarMiembro, useCrearGrupo, useCuotas, useGrupos } from "../api/catalogos.js";
import { useSession } from "../api/session.js";
import {
  estadoSesionEtiqueta,
  fechaCorta,
  type TallerSesionDTO,
  useAbrirSesion,
  useAlumnos,
  useAsistencia,
  useCambiarAsesor,
  useCancelarSesion,
  useCerrarSesion,
  useCorregirAsistencia,
  useEditarTaller,
  useReprogramarSesion,
  useSesiones,
  useTaller,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

function pagosEtiqueta(p: { pagosEstado: string; pagosVencidas: number }): string {
  if (p.pagosEstado === "AL_DIA") return "Al día";
  if (p.pagosEstado === "SIN_CUOTAS") return "Sin cuotas";
  if (p.pagosVencidas === 1) return "1 cuota vencida";
  return `${p.pagosVencidas} cuotas vencidas`;
}

/** P3 Detalle del taller + P4 Sesiones y asistencia (RF-0212, RF-0213, RF-0202/05). */
export function TallerDetallePage({ id }: { id: string }) {
  const query = useTaller(id);
  const { sesion } = useSession();
  const esAsesor = sesion?.rol === "ASESOR" || sesion?.rol === "JURADO";
  // P5 lleva a P4: el asesor entra directo a Sesiones.
  const [tab, setTab] = useState<string | null>(null);
  const t = query.data;
  const actual = tab ?? (esAsesor ? "sesiones" : "alumnos");

  return (
    <AppShell activo="/talleres">
      {!t ? (
        <PageHeader
          titulo="Detalle del taller"
          descripcion={query.isPending ? "Cargando…" : "No encontrado"}
        />
      ) : (
        <>
          <PageHeader
            titulo={t.nombre}
            insignia={<StatusBadge estado={t.estado} />}
            descripcion={`Asesor: ${t.asesorNombre ?? "—"} · Período ${t.periodo ?? "—"} · Cupo ${t.inscritos}/${t.cupoMax ?? "—"}${t.enlace ? " · Enlace de reunión" : ""}`}
            acciones={<AccionesTaller id={id} />}
          />
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Secciones del taller">
            {(
              [
                ["alumnos", "Alumnos"],
                ["sesiones", "Sesiones"],
                ["grupos", "Grupos y pensiones"],
              ] as Array<[string, string]>
            ).map(([v, etiqueta]) => (
              <Button
                key={v}
                tamano="sm"
                variante={actual === v ? "oscuro" : "contorno"}
                onClick={() => setTab(v)}
                type="button"
              >
                {etiqueta}
              </Button>
            ))}
          </div>
          <div className="pt-1">
            {actual === "alumnos" && <AlumnosTab id={id} />}
            {actual === "sesiones" && <SesionesTab id={id} />}
            {actual === "grupos" && <GruposTab />}
          </div>
        </>
      )}
    </AppShell>
  );
}

function AccionesTaller({ id }: { id: string }) {
  const avisar = useToast();
  const query = useTaller(id);
  const editar = useEditarTaller(id);
  const cambiar = useCambiarAsesor(id);
  const [modo, setModo] = useState<"editar" | "asesor" | null>(null);
  const [nombre, setNombre] = useState("");
  const [cupo, setCupo] = useState("");
  const [enlace, setEnlace] = useState("");
  const [dni, setDni] = useState("");
  const [motivo, setMotivo] = useState("");
  const t = query.data;
  const activo = t?.estado === "ACTIVO";

  async function onEditar(): Promise<void> {
    try {
      await editar.mutateAsync({
        ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
        ...(cupo ? { cupoMax: Number(cupo) } : {}),
        ...(enlace.trim() ? { enlace: enlace.trim() } : {}),
      });
      setModo(null);
      avisar("Taller actualizado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo guardar", "error");
    }
  }

  async function onAsesor(): Promise<void> {
    try {
      await cambiar.mutateAsync({ asesorDni: dni.trim(), motivo: motivo.trim() });
      setModo(null);
      setDni("");
      setMotivo("");
      avisar("Asesor cambiado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo cambiar", "error");
    }
  }

  if (!activo) return null;
  return (
    <span className="flex flex-wrap gap-2">
      <Button
        tamano="sm"
        variante="contorno"
        onClick={() => setModo(modo === "asesor" ? null : "asesor")}
        type="button"
      >
        Cambiar asesor
      </Button>
      <Button
        tamano="sm"
        variante="contorno"
        onClick={() => setModo(modo === "editar" ? null : "editar")}
        type="button"
      >
        Editar
      </Button>
      {modo === "editar" && (
        <Card>
          <div className="grid gap-2 p-4 md:grid-cols-3">
            <input
              aria-label="Nombre"
              className={cn(controlClase, "h-9")}
              placeholder="Nombre"
              defaultValue={t?.nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              aria-label="Cupo máximo"
              className={cn(controlClase, "h-9")}
              placeholder="Cupo"
              type="number"
              onChange={(e) => setCupo(e.target.value)}
            />
            <input
              aria-label="Enlace"
              className={cn(controlClase, "h-9")}
              placeholder="https://…"
              defaultValue={t?.enlace ?? ""}
              onChange={(e) => setEnlace(e.target.value)}
            />
            <span className="md:col-span-3">
              <Button
                tamano="sm"
                variante="oscuro"
                disabled={editar.isPending}
                onClick={() => void onEditar()}
                type="button"
              >
                Guardar
              </Button>
            </span>
          </div>
        </Card>
      )}
      {modo === "asesor" && (
        <Card>
          <div className="grid gap-2 p-4 md:grid-cols-[160px_1fr_auto]">
            <input
              aria-label="DNI del nuevo asesor"
              className={cn(controlClase, "h-9")}
              placeholder="DNI 8 dígitos"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <input
              aria-label="Motivo del cambio"
              className={cn(controlClase, "h-9")}
              placeholder="Motivo del cambio"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <Button
              tamano="sm"
              variante="oscuro"
              disabled={cambiar.isPending}
              onClick={() => void onAsesor()}
              type="button"
            >
              Cambiar
            </Button>
          </div>
        </Card>
      )}
    </span>
  );
}

function AlumnosTab({ id }: { id: string }) {
  const avisar = useToast();
  const alumnos = useAlumnos(id);
  const agregar = useAgregarMiembro();
  const detalle = useTaller(id);
  const [dni, setDni] = useState("");
  const [grupoId, setGrupoId] = useState("");
  const filas = alumnos.data?.items ?? [];

  const [mostrarForm, setMostrarForm] = useState(false);

  async function onAsignar(): Promise<void> {
    if (!/^\d{8}$/.test(dni.trim())) {
      avisar("DNI debe tener 8 dígitos", "error");
      return;
    }
    if (!grupoId) {
      avisar("Elige el grupo", "error");
      return;
    }
    try {
      await agregar.mutateAsync({ grupoId, usuarioDni: dni.trim() });
      setDni("");
      setMostrarForm(false);
      avisar("Alumno asignado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo asignar", "error");
    }
  }

  return (
    <Card>
      <CardEncabezado
        titulo="Alumnos del taller · RF-0212, RF-0213"
        accion={
          <Button
            tamano="sm"
            variante="exito"
            onClick={() => setMostrarForm((v) => !v)}
            type="button"
          >
            Asignar alumno
          </Button>
        }
      />
      {mostrarForm && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
          <input
            aria-label="DNI del alumno"
            className={cn(controlClase, "h-9 max-w-44")}
            placeholder="DNI 8 dígitos"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />
          <select
            aria-label="Grupo"
            className={cn(controlClase, "h-9 max-w-52")}
            value={grupoId}
            onChange={(e) => setGrupoId(e.target.value)}
          >
            <option value="">Grupo…</option>
            {(detalle.data?.grupos ?? []).map((g) => (
              <option key={g.id} value={g.id}>
                {g.nombre}
              </option>
            ))}
          </select>
          <Button
            tamano="sm"
            variante="oscuro"
            disabled={agregar.isPending}
            onClick={() => void onAsignar()}
            type="button"
          >
            Asignar
          </Button>
        </div>
      )}
      <div className="p-4">
        <DataTable
          cargando={alumnos.isPending}
          vacio="Aún no hay alumnos asignados."
          columnas={[
            { encabezado: "Alumno", celda: (f) => f.nombres },
            {
              encabezado: "DNI",
              celda: (f) => <span className="tabular-nums">{f.usuarioDni}</span>,
            },
            { encabezado: "Grupo", celda: (f) => f.grupoNombre },
            { encabezado: "% asistencia", celda: (f) => `${f.asistenciaPct} %` },
            {
              encabezado: "Pagos",
              celda: (f) => <StatusBadge estado={f.pagosEstado} extra={pagosEtiqueta(f)} />,
            },
          ]}
          filas={filas.map((f) => ({ ...f, id: f.usuarioDni }))}
        />
        <p className="mt-2 text-xs text-grafito-600">
          Asignar alumno pide DNI y grupo, y avisa si el cupo está lleno. Sesiones es la pantalla
          P4; Grupos y pensiones es la sección actual, movida aquí.
        </p>
      </div>
    </Card>
  );
}

function SesionesTab({ id }: { id: string }) {
  const sesiones = useSesiones(id);
  const [sel, setSel] = useState<string | null>(null);
  const [reprog, setReprog] = useState<{
    id: string;
    fecha: string;
    horaInicio: string;
    horaFin: string;
    motivo: string;
  } | null>(null);
  const [cancel, setCancel] = useState<{ id: string; motivo: string } | null>(null);
  const filas = sesiones.data?.items ?? [];
  const selSesion = filas.find((x) => x.id === sel) ?? null;

  return (
    <div className="space-y-3">
      <div className="grid items-start gap-3 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="p-4">
            <DataTable
              cargando={sesiones.isPending}
              vacio="Sin sesiones: el taller aún no genera su cronograma."
              columnas={[
                { encabezado: "N°", celda: (f) => f.nro },
                { encabezado: "Fecha", celda: (f) => fechaCorta(f.fecha) },
                { encabezado: "Hora", celda: (f) => `${f.horaInicio}-${f.horaFin}` },
                {
                  encabezado: "Estado",
                  celda: (f) => (
                    <StatusBadge estado={f.estado} etiqueta={estadoSesionEtiqueta(f.estado)} />
                  ),
                },
                {
                  encabezado: "Acciones",
                  celda: (f) => (
                    <AccionesSesion
                      sesion={f}
                      tallerId={id}
                      seleccionada={sel === f.id}
                      onVer={() => setSel(sel === f.id ? null : f.id)}
                      onReprogramar={() =>
                        setReprog({
                          id: f.id,
                          fecha: f.fecha,
                          horaInicio: f.horaInicio,
                          horaFin: f.horaFin,
                          motivo: "",
                        })
                      }
                      onCancelar={() => setCancel({ id: f.id, motivo: "" })}
                    />
                  ),
                },
              ]}
              filas={filas.map((f) => ({ ...f, id: f.id }))}
            />
          </div>
        </Card>
        {selSesion && <AsistenciaPanel sesion={selSesion} />}
      </div>
      {reprog && (
        <Card>
          <CardEncabezado
            titulo="Reprogramar sesión"
            descripcion="Solo cambia esa sesión; lo marcado se conserva."
          />
          <div className="flex flex-wrap gap-2 p-4">
            <input
              aria-label="Nueva fecha"
              type="date"
              className={cn(controlClase, "h-9")}
              value={reprog.fecha}
              onChange={(e) => setReprog({ ...reprog, fecha: e.target.value })}
            />
            <input
              aria-label="Nueva hora de inicio"
              type="time"
              className={cn(controlClase, "h-9 max-w-32")}
              value={reprog.horaInicio}
              onChange={(e) => setReprog({ ...reprog, horaInicio: e.target.value })}
            />
            <input
              aria-label="Nueva hora de fin"
              type="time"
              className={cn(controlClase, "h-9 max-w-32")}
              value={reprog.horaFin}
              onChange={(e) => setReprog({ ...reprog, horaFin: e.target.value })}
            />
            <input
              aria-label="Motivo"
              className={cn(controlClase, "h-9 min-w-52 flex-1")}
              placeholder="Motivo"
              value={reprog.motivo}
              onChange={(e) => setReprog({ ...reprog, motivo: e.target.value })}
            />
            <ReprogBoton tallerId={id} reprog={reprog} onListo={() => setReprog(null)} />
          </div>
        </Card>
      )}
      {cancel && (
        <Card>
          <CardEncabezado
            titulo="Cancelar sesión"
            descripcion="No admite asistencia y no cuenta para el porcentaje."
          />
          <div className="flex flex-wrap gap-2 p-4">
            <input
              aria-label="Motivo de la cancelación"
              className={cn(controlClase, "h-9 min-w-52 flex-1")}
              placeholder="Motivo"
              value={cancel.motivo}
              onChange={(e) => setCancel({ ...cancel, motivo: e.target.value })}
            />
            <CancelarBoton tallerId={id} cancel={cancel} onListo={() => setCancel(null)} />
          </div>
        </Card>
      )}
      {selSesion && <AsistenciaPanel sesion={selSesion} />}
    </div>
  );
}

function AccionesSesion({
  sesion,
  tallerId,
  seleccionada,
  onVer,
  onReprogramar,
  onCancelar,
}: {
  sesion: TallerSesionDTO;
  tallerId: string;
  seleccionada: boolean;
  onVer: () => void;
  onReprogramar: () => void;
  onCancelar: () => void;
}) {
  const avisar = useToast();
  const abrir = useAbrirSesion(sesion.id, tallerId);
  const cerrar = useCerrarSesion(sesion.id, tallerId);

  async function correr(p: Promise<unknown>, okMsg: string): Promise<void> {
    try {
      await p;
      avisar(okMsg);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "Operación fallida", "error");
    }
  }

  return (
    <span className="flex flex-wrap gap-1">
      <Button tamano="xs" variante="contorno" onClick={onVer} type="button">
        {seleccionada ? "Ocultar" : "Ver asistencia"}
      </Button>
      {sesion.estado === "PROGRAMADA" && (
        <>
          <Button
            tamano="xs"
            variante="exito"
            disabled={abrir.isPending}
            onClick={() => void correr(abrir.mutateAsync(), "Asistencia abierta")}
            type="button"
          >
            Abrir asistencia
          </Button>
          <Button tamano="xs" variante="contorno" onClick={onReprogramar} type="button">
            Reprogramar
          </Button>
          <Button tamano="xs" variante="fantasma" onClick={onCancelar} type="button">
            Cancelar
          </Button>
        </>
      )}
      {sesion.estado === "ABIERTA" && (
        <Button
          tamano="xs"
          variante="oscuro"
          disabled={cerrar.isPending}
          onClick={() => void correr(cerrar.mutateAsync(), "Asistencia cerrada")}
          type="button"
        >
          Cerrar asistencia
        </Button>
      )}
    </span>
  );
}

function CancelarBoton({
  tallerId,
  cancel,
  onListo,
}: {
  tallerId: string;
  cancel: { id: string; motivo: string };
  onListo: () => void;
}) {
  const avisar = useToast();
  const mut = useCancelarSesion(cancel.id, tallerId);
  return (
    <Button
      tamano="sm"
      variante="oscuro"
      disabled={mut.isPending}
      onClick={() =>
        void mut
          .mutateAsync(cancel.motivo)
          .then(() => {
            avisar("Sesión cancelada");
            onListo();
          })
          .catch((e: unknown) => avisar(e instanceof Error ? e.message : "No se pudo", "error"))
      }
      type="button"
    >
      Confirmar
    </Button>
  );
}

function ReprogBoton({
  tallerId,
  reprog,
  onListo,
}: {
  tallerId: string;
  reprog: { id: string; fecha: string; horaInicio: string; horaFin: string; motivo: string };
  onListo: () => void;
}) {
  const avisar = useToast();
  const mut = useReprogramarSesion(reprog.id, tallerId);
  return (
    <Button
      tamano="sm"
      variante="oscuro"
      disabled={mut.isPending}
      onClick={() =>
        void mut
          .mutateAsync({
            fecha: reprog.fecha,
            horaInicio: reprog.horaInicio,
            horaFin: reprog.horaFin,
            motivo: reprog.motivo,
          })
          .then(() => {
            avisar("Sesión reprogramada");
            onListo();
          })
          .catch((e: unknown) => avisar(e instanceof Error ? e.message : "No se pudo", "error"))
      }
      type="button"
    >
      Guardar
    </Button>
  );
}

function AsistenciaPanel({ sesion }: { sesion: TallerSesionDTO }) {
  const avisar = useToast();
  const query = useAsistencia(sesion.id);
  const corregir = useCorregirAsistencia(sesion.id);
  const [editando, setEditando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const filas = query.data?.items ?? [];

  async function onConfirmar(dni: string, estado: "PRESENTE" | "JUSTIFICADA"): Promise<void> {
    if (motivo.trim().length < 5) {
      avisar("El motivo es obligatorio (mínimo 5 letras)", "error");
      return;
    }
    try {
      await corregir.mutateAsync({ usuarioDni: dni, estado, motivo: motivo.trim() });
      setEditando(null);
      setMotivo("");
      avisar("Asistencia actualizada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo", "error");
    }
  }

  return (
    <Card>
      <CardEncabezado
        titulo={`Asistencia · Sesión ${sesion.nro}`}
        accion={
          sesion.estado === "ABIERTA" ? (
            <StatusBadge estado="ABIERTA" etiqueta={`Abierta hasta ${sesion.horaFin}`} />
          ) : undefined
        }
      />
      <div className="p-4">
        <DataTable
          cargando={query.isPending}
          vacio="Sin alumnos registrados en la sesión."
          columnas={[
            { encabezado: "Alumno", celda: (f) => f.nombres },
            { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
            {
              encabezado: "",
              celda: (f) => {
                if (editando === f.usuarioDni) {
                  const destino = f.estado === "FALTA" ? "JUSTIFICADA" : "PRESENTE";
                  return (
                    <span className="flex flex-wrap items-center gap-1">
                      <input
                        aria-label={`Motivo para ${f.nombres}`}
                        className={cn(controlClase, "h-8 max-w-40")}
                        placeholder="Motivo…"
                        value={motivo}
                        onChange={(e) => setMotivo(e.target.value)}
                      />
                      <Button
                        tamano="xs"
                        variante="oscuro"
                        disabled={corregir.isPending}
                        onClick={() => void onConfirmar(f.usuarioDni, destino)}
                        type="button"
                      >
                        Confirmar
                      </Button>
                    </span>
                  );
                }
                if (f.estado === "FALTA") {
                  return (
                    <Button
                      tamano="xs"
                      variante="contorno"
                      onClick={() => {
                        setEditando(f.usuarioDni);
                        setMotivo("");
                      }}
                      type="button"
                    >
                      Justificar
                    </Button>
                  );
                }
                if (f.estado === "JUSTIFICADA" || f.estado === "PRESENTE") {
                  return (
                    <Button
                      tamano="xs"
                      variante="contorno"
                      onClick={() => {
                        setEditando(f.usuarioDni);
                        setMotivo("");
                      }}
                      type="button"
                    >
                      Corregir
                    </Button>
                  );
                }
                return <span className="text-grafito-600">—</span>;
              },
            },
          ]}
          filas={filas.map((f) => ({ ...f, id: f.usuarioDni }))}
        />
        <p className="mt-2 text-xs text-grafito-600">
          Al cerrar la asistencia, los pendientes pasan a falta.
        </p>
      </div>
    </Card>
  );
}

function GruposTab() {
  const avisar = useToast();
  const grupos = useGrupos();
  const crear = useCrearGrupo();
  const agregar = useAgregarMiembro();
  const [nombre, setNombre] = useState("");
  const [tallerId, setTallerId] = useState("");
  const [dni, setDni] = useState<Record<string, string>>({});
  const [cuotasDe, setCuotasDe] = useState<string | null>(null);
  const items = grupos.data ?? [];

  return (
    <div className="space-y-3">
      <Card>
        <CardEncabezado
          titulo="Grupos del taller"
          descripcion="La sección actual, movida aquí (P3)."
        />
        <div className="p-4">
          <DataTable
            cargando={grupos.isPending}
            vacio="No existen grupos."
            columnas={[
              { encabezado: "Grupo", celda: (g) => <strong>{g.nombre}</strong> },
              { encabezado: "Taller", celda: (g) => g.tallerNombre },
              { encabezado: "Miembros", celda: (g) => g.miembros },
              { encabezado: "Cuotas pend.", celda: (g) => g.cuotasPendientes },
              { encabezado: "Estado", celda: (g) => <StatusBadge estado={g.estado} /> },
              {
                encabezado: "Acciones",
                celda: (g) => (
                  <span className="flex gap-1">
                    <span className="flex gap-1">
                      <input
                        aria-label={`DNI para ${g.nombre}`}
                        className={cn(controlClase, "h-8 max-w-32")}
                        placeholder="DNI"
                        value={dni[g.id] ?? ""}
                        onChange={(e) => setDni((p) => ({ ...p, [g.id]: e.target.value }))}
                      />
                      <Button
                        tamano="xs"
                        variante="contorno"
                        disabled={agregar.isPending}
                        onClick={() =>
                          void agregar
                            .mutateAsync({ grupoId: g.id, usuarioDni: (dni[g.id] ?? "").trim() })
                            .then(() => avisar("Miembro agregado"))
                            .catch((e: unknown) =>
                              avisar(e instanceof Error ? e.message : "No se pudo", "error"),
                            )
                        }
                        type="button"
                      >
                        Agregar
                      </Button>
                    </span>
                    <Button
                      tamano="xs"
                      variante="fantasma"
                      onClick={() => setCuotasDe((v) => (v === g.id ? null : g.id))}
                      type="button"
                    >
                      {cuotasDe === g.id ? "Ocultar" : "Cuotas"}
                    </Button>
                  </span>
                ),
              },
            ]}
            filas={items}
          />
          {cuotasDe && <CuotasGrupo grupoId={cuotasDe} />}
        </div>
      </Card>
      <Card>
        <CardEncabezado
          titulo="Nuevo grupo"
          descripcion="El cronograma de pensiones se programa en Pagos del taller."
        />
        <div className="grid gap-2 p-4 md:grid-cols-[1fr_1fr_auto]">
          <input
            aria-label="Taller (id)"
            className={cn(controlClase, "h-9")}
            placeholder="ID del taller"
            value={tallerId}
            onChange={(e) => setTallerId(e.target.value)}
          />
          <input
            aria-label="Nombre del grupo"
            className={cn(controlClase, "h-9")}
            placeholder="Nombre del grupo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <Button
            tamano="sm"
            variante="oscuro"
            disabled={crear.isPending}
            onClick={() =>
              void crear
                .mutateAsync({ tallerId, nombre: nombre.trim() })
                .then(() => {
                  setNombre("");
                  avisar("Grupo creado");
                })
                .catch((e: unknown) =>
                  avisar(e instanceof Error ? e.message : "No se pudo", "error"),
                )
            }
            type="button"
          >
            Crear grupo
          </Button>
        </div>
      </Card>
    </div>
  );
}

function CuotasGrupo({ grupoId }: { grupoId: string }) {
  const cuotas = useCuotas(grupoId);
  return (
    <div className="mt-2">
      <DataTable
        cargando={cuotas.isPending}
        vacio="Sin cronograma: programa las pensiones primero."
        columnas={[
          { encabezado: "Tesista", celda: (c) => `${c.nombres} · ${c.usuarioDni}` },
          { encabezado: "Cuota", celda: (c) => `N° ${c.nroCuota}` },
          { encabezado: "Monto", celda: (c) => `S/ ${c.monto}` },
          { encabezado: "Vence", celda: (c) => c.vencimiento },
          { encabezado: "Estado", celda: (c) => <StatusBadge estado={c.estado} /> },
        ]}
        filas={cuotas.data ?? []}
      />
    </div>
  );
}
