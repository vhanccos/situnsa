import { useState } from "react";
import { abrirArchivoProtegido } from "../api/expedientes.js";
import { useSession } from "../api/session.js";
import {
  diaMes,
  entregaUrl,
  type TallerAvanceDTO,
  useAlumnos,
  useAvances,
  useCrearFase,
  useFases,
  useMarcarCumplimiento,
  usePases,
  useRevertirPase,
  useRevisarEntrega,
  useSesiones,
  useSolicitarAvance,
  useTaller,
  useValidarPase,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

/** P6 Agenda del asesor: fases, matriz, condiciones de pase y avances (RF-0208 a RF-0210). */
export function AgendaPage({ id }: { id: string }) {
  const taller = useTaller(id);
  const fasesQ = useFases(id);
  const pasesQ = usePases(id);
  const t = taller.data;
  const fases = [...(fasesQ.data?.fases ?? [])].sort((a, b) => a.orden - b.orden);
  const matriz = fasesQ.data?.matriz ?? [];
  const filas = pasesQ.data?.items ?? [];
  const [selDni, setSelDni] = useState<string | null>(null);
  const sel =
    filas.find((f) => f.usuarioDni === selDni) ??
    filas.find((f) => !f.elegible) ??
    filas[0] ??
    null;

  return (
    <AppShell activo="/mis-talleres">
      <PageHeader
        titulo={t ? `Agenda · ${t.nombre}` : "Agenda del taller"}
        descripcion="Fases y cumplimiento · RF-0208, RF-0210"
      />
      {!t && !taller.isPending ? (
        <EmptyState titulo="Taller no encontrado" />
      ) : (
        <div className="space-y-3">
          <div className="grid items-start gap-3 xl:grid-cols-[300px_1fr]">
            <FasesCard tallerId={id} fases={fases} />
            <MatrizCard
              tallerId={id}
              fases={fases}
              matriz={matriz}
              filas={filas}
              cargando={fasesQ.isPending || pasesQ.isPending}
              onElegir={setSelDni}
            />
          </div>
          {sel && <CondicionesCard tallerId={id} fases={fases} matriz={matriz} fila={sel} />}
          <AvancesPanel tallerId={id} />
        </div>
      )}
    </AppShell>
  );
}

function FasesCard({
  tallerId,
  fases,
}: {
  tallerId: string;
  fases: Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    fechaRef: string | null;
    orden: number;
  }>;
}) {
  const avisar = useToast();
  const crear = useCrearFase(tallerId);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaRef, setFechaRef] = useState("");

  async function onCrear(): Promise<void> {
    if (nombre.trim().length < 3) {
      avisar("El nombre debe tener al menos 3 letras", "error");
      return;
    }
    try {
      await crear.mutateAsync({
        nombre: nombre.trim(),
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        ...(fechaRef ? { fechaRef } : {}),
      });
      setNombre("");
      setDescripcion("");
      setFechaRef("");
      setAbierto(false);
      avisar("Fase agregada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo crear", "error");
    }
  }

  return (
    <Card>
      <div className="space-y-2 p-4">
        <p className="text-base font-bold text-navy-950">Fases</p>
        {fases.length === 0 ? (
          <p className="text-sm text-grafito-600">Sin fases todavía.</p>
        ) : (
          <ol className="space-y-1 text-sm text-grafito-700">
            {fases.map((f) => (
              <li key={f.id} className="tabular-nums">
                {f.orden} · {f.nombre}
                {f.fechaRef ? ` · ${diaMes(f.fechaRef)}` : ""}
              </li>
            ))}
          </ol>
        )}
        {abierto ? (
          <div className="space-y-2 border-t border-slate-200 pt-2">
            <input
              aria-label="Nombre de la fase"
              className={cn(controlClase, "h-9")}
              placeholder="Marco teórico"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              aria-label="Descripción de la fase"
              className={cn(controlClase, "h-9")}
              placeholder="Descripción (opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <input
              aria-label="Fecha orientativa"
              type="date"
              className={cn(controlClase, "h-9")}
              value={fechaRef}
              onChange={(e) => setFechaRef(e.target.value)}
            />
            <Button
              tamano="sm"
              variante="oscuro"
              disabled={crear.isPending}
              onClick={() => void onCrear()}
              type="button"
            >
              Agregar
            </Button>
          </div>
        ) : (
          <Button tamano="sm" variante="contorno" onClick={() => setAbierto(true)} type="button">
            Agregar fase
          </Button>
        )}
      </div>
    </Card>
  );
}

interface FilaPase {
  usuarioDni: string;
  nombres: string;
  elegible: boolean;
  validacionAsesor: boolean;
  pase: { validadoPor: string; validadoDni: string; createdAt: string } | null;
}

function MatrizCard({
  tallerId,
  fases,
  matriz,
  filas,
  cargando,
  onElegir,
}: {
  tallerId: string;
  fases: Array<{ id: string; nombre: string; orden: number }>;
  matriz: Array<{
    usuarioDni: string;
    nombres: string;
    celdas: Array<{ faseId: string; estado: "PENDIENTE" | "CUMPLIDA" | "OBSERVADA" }>;
  }>;
  filas: FilaPase[];
  cargando: boolean;
  onElegir: (dni: string) => void;
}) {
  const avisar = useToast();
  const validar = useValidarPase(tallerId);
  const porDni = new Map(filas.map((f) => [f.usuarioDni, f]));

  async function onValidar(dni: string): Promise<void> {
    try {
      await validar.mutateAsync(dni);
      avisar("Pase validado: el alumno avanza a Plan de tesis");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo validar", "error");
    }
  }

  return (
    <Card>
      <div className="p-4">
        <DataTable
          cargando={cargando}
          vacio="Sin alumnos para evaluar."
          columnas={[
            { encabezado: "Alumno", celda: (f) => f.nombres },
            ...fases.map((fase) => ({
              encabezado: `Fase ${fase.orden}`,
              celda: (f: (typeof matriz)[number]) => {
                const celda = f.celdas.find((c) => c.faseId === fase.id);
                if (!celda) return "—";
                return (
                  <span className="flex flex-col items-start gap-1">
                    <StatusBadge estado={celda.estado} />
                    <MarcarCelda tallerId={tallerId} faseId={fase.id} dni={f.usuarioDni} />
                  </span>
                );
              },
            })),
            {
              encabezado: "Acción",
              celda: (f) => {
                const fila = porDni.get(f.usuarioDni);
                const elegible = fila?.elegible && !fila.pase;
                if (elegible) {
                  return (
                    <Button
                      tamano="sm"
                      variante="exito"
                      disabled={validar.isPending}
                      onClick={() => void onValidar(f.usuarioDni)}
                      type="button"
                    >
                      Validar y pasar a Plan de tesis
                    </Button>
                  );
                }
                return (
                  <Button
                    tamano="sm"
                    variante="contorno"
                    onClick={() => onElegir(f.usuarioDni)}
                    type="button"
                  >
                    Validar y pasar a Plan de tesis
                  </Button>
                );
              },
            },
          ]}
          filas={matriz.map((f) => ({ ...f, id: f.usuarioDni }))}
        />
      </div>
    </Card>
  );
}

function MarcarCelda({ tallerId, faseId, dni }: { tallerId: string; faseId: string; dni: string }) {
  const avisar = useToast();
  const mut = useMarcarCumplimiento(faseId, tallerId);
  const [pideMotivo, setPideMotivo] = useState(false);
  const [comentario, setComentario] = useState("");

  async function marcar(estado: "CUMPLIDA" | "OBSERVADA"): Promise<void> {
    if (estado === "OBSERVADA" && comentario.trim().length < 5) {
      avisar("La observación exige un comentario (mínimo 5 letras)", "error");
      return;
    }
    try {
      await mut.mutateAsync({
        usuarioDni: dni,
        estado,
        ...(estado === "OBSERVADA" ? { comentario: comentario.trim() } : {}),
      });
      setPideMotivo(false);
      setComentario("");
      avisar("Cumplimiento actualizado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo marcar", "error");
    }
  }

  if (pideMotivo) {
    return (
      <span className="flex items-center gap-1">
        <input
          aria-label="Comentario de la observación"
          className={cn(controlClase, "h-7 max-w-28 text-xs")}
          placeholder="Comentario…"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
        />
        <button
          className="text-xs font-semibold text-navy-800 underline"
          disabled={mut.isPending}
          onClick={() => void marcar("OBSERVADA")}
          type="button"
        >
          OK
        </button>
      </span>
    );
  }
  return (
    <span className="flex gap-2 text-xs">
      <button
        className="font-semibold text-navy-800 underline"
        disabled={mut.isPending}
        onClick={() => void marcar("CUMPLIDA")}
        type="button"
      >
        Cumplida
      </button>
      <button
        className="font-semibold text-navy-800 underline"
        disabled={mut.isPending}
        onClick={() => setPideMotivo(true)}
        type="button"
      >
        Observar
      </button>
    </span>
  );
}

function CondicionesCard({
  tallerId,
  fases,
  matriz,
  fila,
}: {
  tallerId: string;
  fases: Array<{ id: string; orden: number }>;
  matriz: Array<{
    usuarioDni: string;
    celdas: Array<{ faseId: string; estado: "PENDIENTE" | "CUMPLIDA" | "OBSERVADA" }>;
  }>;
  fila: FilaPase & {
    asistenciaPct?: number;
    cuotasAlDia?: boolean | null;
    faltantes?: string[];
    avisos?: string[];
  };
}) {
  const avisar = useToast();
  const revertir = useRevertirPase(tallerId);
  const { sesion } = useSession();
  const esAdmin = sesion?.rol === "ADMIN_FIPS";
  const [motivo, setMotivo] = useState("");
  const ordenadas = [...fases].sort((a, b) => a.orden - b.orden);
  const celdaPorFase = new Map(
    (matriz.find((m) => m.usuarioDni === fila.usuarioDni)?.celdas ?? []).map((c) => [
      c.faseId,
      c.estado,
    ]),
  );
  const faltan = ordenadas.filter((f) => celdaPorFase.get(f.id) !== "CUMPLIDA").map((f) => f.orden);
  const fasesTexto =
    faltan.length === 0
      ? "sí"
      : faltan.length === 1
        ? `falta la ${faltan[0]}`
        : `falta la ${faltan.slice(0, -1).join(", ")} y la ${faltan[faltan.length - 1]}`;

  async function onRevertir(): Promise<void> {
    if (motivo.trim().length < 5) {
      avisar("Cuenta el motivo de la reversión (mínimo 5 letras)", "error");
      return;
    }
    try {
      await revertir.mutateAsync({ usuarioDni: fila.usuarioDni, motivo: motivo.trim() });
      setMotivo("");
      avisar("Pase revertido");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo revertir", "error");
    }
  }

  return (
    <Card>
      <div className="space-y-1 p-4">
        <p className="text-sm font-bold text-navy-950">
          Condiciones para pasar a Plan de tesis · {fila.nombres}
        </p>
        <p className="text-sm text-grafito-600">
          Fases completas: {fasesTexto} · Validación del asesor:{" "}
          {fila.validacionAsesor ? "registrada" : "pendiente"}
        </p>
        <p className="text-sm text-grafito-600">
          Por confirmar con el cliente: asistencia mínima y pagos al día.
        </p>
        {fila.pase && esAdmin && (
          <span className="flex flex-wrap items-center gap-2 pt-1">
            <input
              aria-label={`Motivo de reversión para ${fila.nombres}`}
              className={cn(controlClase, "h-8 max-w-52")}
              placeholder="Motivo de la reversión…"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
            <Button
              tamano="xs"
              variante="contorno"
              disabled={revertir.isPending}
              onClick={() => void onRevertir()}
              type="button"
            >
              Revertir pase
            </Button>
          </span>
        )}
      </div>
    </Card>
  );
}

function AvancesPanel({ tallerId }: { tallerId: string }) {
  const avisar = useToast();
  const query = useAvances(tallerId);
  const sesiones = useSesiones(tallerId);
  const alumnos = useAlumnos(tallerId);
  const solicitar = useSolicitarAvance(tallerId);
  const [descripcion, setDescripcion] = useState("");
  const [plazo, setPlazo] = useState("");
  const [sesionId, setSesionId] = useState("");
  const items = query.data?.items ?? [];
  const todos = alumnos.data?.items ?? [];

  async function onSolicitar(): Promise<void> {
    if (descripcion.trim().length < 5) {
      avisar("Describe qué debe entregar el alumno (mínimo 5 letras)", "error");
      return;
    }
    if (!plazo) {
      avisar("El plazo es obligatorio", "error");
      return;
    }
    try {
      await solicitar.mutateAsync({
        descripcion: descripcion.trim(),
        plazo,
        ...(sesionId ? { sesionId } : {}),
      });
      setDescripcion("");
      setPlazo("");
      setSesionId("");
      avisar("Avance solicitado: se avisa al alumno por correo");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo solicitar", "error");
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardEncabezado titulo="Solicitar avance" descripcion="Se notifica al alumno por correo." />
        <div className="grid gap-2 p-4 md:grid-cols-[1fr_160px_180px_auto]">
          <input
            aria-label="Qué debe entregar"
            className={cn(controlClase, "h-9")}
            placeholder="Entregar el capítulo II…"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
          <input
            aria-label="Plazo"
            type="date"
            className={cn(controlClase, "h-9")}
            value={plazo}
            onChange={(e) => setPlazo(e.target.value)}
          />
          <select
            aria-label="Sesión"
            className={cn(controlClase, "h-9")}
            value={sesionId}
            onChange={(e) => setSesionId(e.target.value)}
          >
            <option value="">Sin sesión</option>
            {(sesiones.data?.items ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                Sesión {s.nro} · {s.fecha}
              </option>
            ))}
          </select>
          <Button
            tamano="sm"
            variante="oscuro"
            disabled={solicitar.isPending}
            onClick={() => void onSolicitar()}
            type="button"
          >
            Solicitar
          </Button>
        </div>
      </Card>
      {items.length === 0 && !query.isPending ? (
        <EmptyState titulo="Aún no hay avances solicitados" />
      ) : (
        items.map((a) => <AvanceCard key={a.id} tallerId={tallerId} avance={a} alumnos={todos} />)
      )}
    </div>
  );
}

function AvanceCard({
  tallerId,
  avance,
  alumnos,
}: {
  tallerId: string;
  avance: TallerAvanceDTO;
  alumnos: Array<{ usuarioDni: string; nombres: string }>;
}) {
  const avisar = useToast();
  const [obs, setObs] = useState<Record<string, string>>({});
  const revisar = useRevisarEntrega(avance.id, tallerId);
  const entregaron = new Set(avance.entregas.map((e) => e.usuarioDni));
  const vencido = hoyLima() > avance.plazo;
  const sinEntrega = vencido ? alumnos.filter((a) => !entregaron.has(a.usuarioDni)) : [];

  async function onRevisar(dni: string, estado: "CONFORME" | "OBSERVADO"): Promise<void> {
    const observacion = obs[dni] ?? "";
    if (estado === "OBSERVADO" && observacion.trim().length < 5) {
      avisar("La observación exige un motivo (mínimo 5 letras)", "error");
      return;
    }
    try {
      await revisar.mutateAsync({
        usuarioDni: dni,
        estado,
        ...(observacion.trim() ? { observacion: observacion.trim() } : {}),
      });
      avisar(estado === "CONFORME" ? "Entrega conforme" : "Entrega observada");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo revisar", "error");
    }
  }

  async function onDescargar(entregaId: string): Promise<void> {
    try {
      await abrirArchivoProtegido(entregaUrl(entregaId));
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo abrir", "error");
    }
  }

  return (
    <Card>
      <CardEncabezado
        titulo={`Avance · vence ${avance.plazo}`}
        descripcion={`${avance.descripcion}${avance.sesionNro !== null ? ` · Sesión ${avance.sesionNro}` : ""}`}
      />
      <div className="p-4">
        <DataTable
          cargando={false}
          vacio="Sin entregas todavía."
          columnas={[
            { encabezado: "Alumno", celda: (f) => <strong>{f.nombres}</strong> },
            { encabezado: "Versión", celda: (f) => `v${f.version}` },
            { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
            {
              encabezado: "Revisar",
              celda: (f) => (
                <span className="flex flex-wrap items-center gap-1">
                  <Button
                    tamano="xs"
                    variante="fantasma"
                    onClick={() => void onDescargar(f.id)}
                    type="button"
                  >
                    Ver archivo
                  </Button>
                  <input
                    aria-label={`Observación para ${f.nombres}`}
                    className={cn(controlClase, "h-8 max-w-44")}
                    placeholder={f.observacion ?? "Observación…"}
                    value={obs[f.usuarioDni] ?? ""}
                    onChange={(e) => setObs((p) => ({ ...p, [f.usuarioDni]: e.target.value }))}
                  />
                  <Button
                    tamano="xs"
                    variante="exito"
                    disabled={revisar.isPending}
                    onClick={() => void onRevisar(f.usuarioDni, "CONFORME")}
                    type="button"
                  >
                    Conforme
                  </Button>
                  <Button
                    tamano="xs"
                    variante="contorno"
                    disabled={revisar.isPending}
                    onClick={() => void onRevisar(f.usuarioDni, "OBSERVADO")}
                    type="button"
                  >
                    Observar
                  </Button>
                </span>
              ),
            },
          ]}
          filas={avance.entregas.map((e) => ({ ...e, id: e.id }))}
        />
        {sinEntrega.length > 0 && (
          <p className="mt-2 text-xs font-medium text-red-700">
            No entregado: {sinEntrega.map((a) => a.nombres).join(", ")}
          </p>
        )}
      </div>
    </Card>
  );
}

/** Fecha actual en Lima (AAAA-MM-DD) para comparar plazos. */
function hoyLima(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
