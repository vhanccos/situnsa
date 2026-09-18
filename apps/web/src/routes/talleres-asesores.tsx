import { GraduationCap, Plus, RotateCw, Users, Wallet } from "lucide-react";
import { useState } from "react";
import {
  useAgregarMiembro,
  useAsesores,
  useCrearAsesor,
  useCrearGrupo,
  useCrearTaller,
  useCuotas,
  useDeudores,
  useGrupos,
  useProgramarPensiones,
  useRegistrarPago,
  useTalleres,
  useToggleAsesor,
} from "../api/catalogos.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Acordeon, AcordeonItem } from "../components/ui/accordion.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { StatCard } from "../components/ui/stat-card.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

/** §§11–12 Taller de Tesis: resumen + tabla + nuevo taller. */
export function TalleresPage() {
  const avisar = useToast();
  const query = useTalleres();
  const crear = useCrearTaller();
  const [nombre, setNombre] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [form, setForm] = useState(false);
  const items = query.data ?? [];

  async function onCrear(): Promise<void> {
    if (nombre.trim().length < 3) {
      avisar("Nombre del taller muy corto", "aviso");
      return;
    }
    try {
      await crear.mutateAsync({ nombre: nombre.trim(), periodo: periodo || undefined });
      setNombre("");
      setPeriodo("");
      setForm(false);
      avisar("Taller creado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo crear", "error");
    }
  }

  return (
    <AppShell activo="/talleres">
      <PageHeader
        titulo="Talleres de Tesis"
        descripcion="Administración de inscripciones, talleres, asesores, avance y asistencia."
        acciones={
          <Button variante="exito" onClick={() => setForm((v) => !v)} type="button">
            <Plus size={16} />
            NUEVO TALLER
          </Button>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          etiqueta="Talleres"
          valor={items.length}
          icono={<GraduationCap size={20} />}
          acento="bg-navy-950"
        />
        <StatCard
          etiqueta="Activos"
          valor={items.filter((t) => t.estado === "ACTIVO").length}
          icono={<GraduationCap size={20} />}
          acento="bg-verde-inst-700"
        />
        <StatCard
          etiqueta="Inscritos"
          valor={items.reduce((n, t) => n + t.inscritos, 0)}
          icono={<Users size={20} />}
          acento="bg-dorado-500"
        />
        <StatCard
          etiqueta="Asesores"
          valor={new Set(items.map((t) => t.asesorNombre).filter(Boolean)).size}
          icono={<Users size={20} />}
          acento="bg-slate-300"
        />
      </div>
      {form && (
        <Card>
          <CardEncabezado titulo="Nuevo taller" />
          <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-3 md:p-5">
            <input
              aria-label="Nombre del taller"
              className={cn(controlClase, "h-10")}
              placeholder="Nombre del taller"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              aria-label="Periodo"
              className={cn(controlClase, "h-10")}
              placeholder="Periodo (2026-I)"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
            <Button
              variante="oscuro"
              disabled={crear.isPending}
              onClick={() => void onCrear()}
              type="button"
            >
              Guardar taller
            </Button>
          </div>
        </Card>
      )}
      <DataTable
        cargando={query.isPending}
        vacio="No existen talleres registrados."
        columnas={[
          { encabezado: "Taller", celda: (f) => <strong>{f.nombre}</strong> },
          { encabezado: "Asesor", celda: (f) => f.asesorNombre ?? "—" },
          { encabezado: "Periodo", celda: (f) => f.periodo ?? "—" },
          { encabezado: "Inscritos", celda: (f) => f.inscritos },
          { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
        ]}
        filas={items}
      />
      <GruposCard talleres={items} />
      <DeudoresCard />
    </AppShell>
  );
}

/** Grupos de taller + miembros + pensiones (Oleada C, HU-0011/12/14). */
function GruposCard({ talleres }: { talleres: Array<{ id: string; nombre: string }> }) {
  const avisar = useToast();
  const grupos = useGrupos();
  const crear = useCrearGrupo();
  const agregar = useAgregarMiembro();
  const programar = useProgramarPensiones();
  const [tallerId, setTallerId] = useState("");
  const [nombre, setNombre] = useState("");
  const [asesorDni, setAsesorDni] = useState("");
  const [miembroDni, setMiembroDni] = useState<Record<string, string>>({});
  const [pens, setPens] = useState<Record<string, { n: string; m: string; f: string }>>({});
  const [cuotasDe, setCuotasDe] = useState<string | null>(null);

  async function onCrear(): Promise<void> {
    if (!tallerId) {
      avisar("Elige el taller del grupo", "error");
      return;
    }
    try {
      await crear.mutateAsync({
        tallerId,
        nombre: nombre.trim(),
        ...(asesorDni.trim() ? { asesorDni: asesorDni.trim() } : {}),
      });
      setNombre("");
      setAsesorDni("");
      avisar("Grupo creado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo crear", "error");
    }
  }

  async function onAgregar(grupoId: string): Promise<void> {
    const dni = (miembroDni[grupoId] ?? "").trim();
    if (!/^\d{8}$/.test(dni)) {
      avisar("DNI debe tener 8 dígitos", "error");
      return;
    }
    try {
      await agregar.mutateAsync({ grupoId, usuarioDni: dni });
      setMiembroDni((p) => ({ ...p, [grupoId]: "" }));
      avisar("Miembro agregado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo agregar", "error");
    }
  }

  async function onProgramar(grupoId: string): Promise<void> {
    const p = pens[grupoId] ?? { n: "", m: "", f: "" };
    const nroCuotas = Number(p.n);
    const monto = Number(p.m);
    if (!Number.isInteger(nroCuotas) || nroCuotas < 1 || nroCuotas > 24 || !(monto > 0)) {
      avisar("Cuotas 1–24 y monto positivo", "error");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.f)) {
      avisar("Vencimiento YYYY-MM-DD", "error");
      return;
    }
    try {
      const r = await programar.mutateAsync({
        grupoId,
        nroCuotas,
        monto,
        primerVencimiento: p.f,
      });
      avisar(`Cronograma: ${r.cuotas} cuotas para ${r.miembros} miembros`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo programar", "error");
    }
  }

  return (
    <Card>
      <CardEncabezado
        titulo="Grupos de taller"
        descripcion="Asignación manual (HU-0011/12) y cronograma de pensiones (HU-0014)."
        tira
        accion={
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
            {grupos.data ? `${grupos.data.length} grupos` : "…"}
          </span>
        }
      />
      <div className="space-y-3 p-4 md:p-5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_160px_auto]">
          <Select label="TALLER" value={tallerId} onChange={setTallerId}>
            <option value="">Seleccione taller…</option>
            {talleres.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </Select>
          <input
            aria-label="Nombre del grupo"
            className={cn(controlClase, "h-9 self-end")}
            placeholder="Nombre del grupo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <input
            aria-label="DNI del asesor (opcional)"
            className={cn(controlClase, "h-9 self-end")}
            placeholder="DNI asesor"
            value={asesorDni}
            onChange={(e) => setAsesorDni(e.target.value)}
          />
          <Button
            className="self-end"
            variante="oscuro"
            disabled={crear.isPending}
            onClick={() => void onCrear()}
            type="button"
          >
            <Plus size={16} />
            Crear grupo
          </Button>
        </div>
        <DataTable
          cargando={grupos.isPending}
          vacio="No existen grupos. Crea el primero arriba."
          columnas={[
            { encabezado: "Grupo", celda: (g) => <strong>{g.nombre}</strong> },
            {
              encabezado: "Taller",
              celda: (g) => <span className="text-xs">{g.tallerNombre}</span>,
            },
            { encabezado: "Asesor", celda: (g) => g.asesorNombre ?? "—" },
            { encabezado: "Miembros", celda: (g) => g.miembros },
            { encabezado: "Cuotas pend.", celda: (g) => g.cuotasPendientes },
            { encabezado: "Estado", celda: (g) => <StatusBadge estado={g.estado} /> },
          ]}
          filas={grupos.data ?? []}
        />
        {(grupos.data ?? []).length > 0 && (
          <Acordeon>
            {(grupos.data ?? []).map((g) => (
              <AcordeonItem
                key={g.id}
                value={g.id}
                titulo={`${g.nombre} · ${g.miembros} miembros`}
                meta={<StatusBadge estado={g.estado} />}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-bold tracking-wider text-grafito-600 uppercase">
                      Agregar miembro por DNI
                    </p>
                    <div className="flex gap-2">
                      <input
                        aria-label={`DNI para ${g.nombre}`}
                        className={cn(controlClase, "h-9")}
                        placeholder="DNI 8 dígitos"
                        value={miembroDni[g.id] ?? ""}
                        onChange={(e) => setMiembroDni((p) => ({ ...p, [g.id]: e.target.value }))}
                      />
                      <Button
                        tamano="sm"
                        variante="contorno"
                        disabled={agregar.isPending}
                        onClick={() => void onAgregar(g.id)}
                        type="button"
                      >
                        Agregar
                      </Button>
                    </div>
                    <p className="text-xs font-bold tracking-wider text-grafito-600 uppercase">
                      Programar pensiones
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        aria-label="N° cuotas"
                        className={cn(controlClase, "h-9")}
                        placeholder="Cuotas"
                        value={pens[g.id]?.n ?? ""}
                        onChange={(e) =>
                          setPens((p) => ({
                            ...p,
                            [g.id]: { n: e.target.value, m: p[g.id]?.m ?? "", f: p[g.id]?.f ?? "" },
                          }))
                        }
                      />
                      <input
                        aria-label="Monto S/"
                        className={cn(controlClase, "h-9")}
                        placeholder="Monto S/"
                        value={pens[g.id]?.m ?? ""}
                        onChange={(e) =>
                          setPens((p) => ({
                            ...p,
                            [g.id]: { n: p[g.id]?.n ?? "", m: e.target.value, f: p[g.id]?.f ?? "" },
                          }))
                        }
                      />
                      <input
                        aria-label="Primer vencimiento"
                        className={cn(controlClase, "h-9")}
                        placeholder="AAAA-MM-DD"
                        value={pens[g.id]?.f ?? ""}
                        onChange={(e) =>
                          setPens((p) => ({
                            ...p,
                            [g.id]: { n: p[g.id]?.n ?? "", m: p[g.id]?.m ?? "", f: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <Button
                      tamano="sm"
                      variante="contorno"
                      disabled={programar.isPending}
                      onClick={() => void onProgramar(g.id)}
                      type="button"
                    >
                      Programar cronograma
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <span className="flex items-center justify-between">
                      <p className="text-xs font-bold tracking-wider text-grafito-600 uppercase">
                        Cuotas y pagos
                      </p>
                      <Button
                        tamano="sm"
                        variante="fantasma"
                        onClick={() => setCuotasDe((v) => (v === g.id ? null : g.id))}
                        type="button"
                      >
                        {cuotasDe === g.id ? "Ocultar" : "Ver cuotas"}
                      </Button>
                    </span>
                    {cuotasDe === g.id && <CuotasTabla grupoId={g.id} />}
                  </div>
                </div>
              </AcordeonItem>
            ))}
          </Acordeon>
        )}
      </div>
    </Card>
  );
}

/** Cuotas del grupo + registro de pago exacto (HU-0015). */
function CuotasTabla({ grupoId }: { grupoId: string }) {
  const avisar = useToast();
  const cuotas = useCuotas(grupoId);
  const pagar = useRegistrarPago();
  const [medio, setMedio] = useState("CAJA");

  async function onPagar(cuotaId: string, monto: number): Promise<void> {
    try {
      await pagar.mutateAsync({ cronogramaId: cuotaId, monto, medio });
      avisar(`Pago S/ ${monto} registrado`);
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo pagar", "error");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold" htmlFor={`medio-${grupoId}`}>
          Medio
        </label>
        <input
          id={`medio-${grupoId}`}
          className={cn(controlClase, "h-8 max-w-36")}
          value={medio}
          onChange={(e) => setMedio(e.target.value)}
        />
      </div>
      <DataTable
        cargando={cuotas.isPending}
        vacio="Sin cronograma: programa las pensiones primero."
        columnas={[
          { encabezado: "Tesista", celda: (c) => `${c.nombres} · ${c.usuarioDni}` },
          { encabezado: "Cuota", celda: (c) => `N° ${c.nroCuota}` },
          { encabezado: "Monto", celda: (c) => `S/ ${c.monto}` },
          { encabezado: "Vence", celda: (c) => c.vencimiento },
          { encabezado: "Estado", celda: (c) => <StatusBadge estado={c.estado} /> },
          {
            encabezado: "Acción",
            celda: (c) =>
              c.estado === "PENDIENTE" ? (
                <Button
                  tamano="xs"
                  variante="exito"
                  disabled={pagar.isPending}
                  onClick={() => void onPagar(c.id, c.monto)}
                  type="button"
                >
                  <Wallet size={13} />
                  Pagar
                </Button>
              ) : (
                <span className="text-xs text-grafito-600">—</span>
              ),
          },
        ]}
        filas={cuotas.data ?? []}
      />
    </div>
  );
}

/** Reporte de deudores (HU-0015): cuotas vencidas agregadas. */
function DeudoresCard() {
  const deudores = useDeudores();
  return (
    <Card>
      <CardEncabezado
        titulo="Deudores"
        descripcion="Tesistas con cuotas vencidas pendientes."
        tira
        accion={
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold tabular-nums">
            {deudores.data ? `${deudores.data.length} deudores` : "…"}
          </span>
        }
      />
      <div className="p-4 md:p-5">
        <DataTable
          cargando={deudores.isPending}
          vacio="Sin deudores: todas las cuotas están al día."
          columnas={[
            {
              encabezado: "Tesista",
              celda: (d) => (
                <span>
                  <span className="font-medium">{d.nombres}</span>
                  <br />
                  <span className="text-xs tabular-nums text-grafito-600">DNI {d.dni}</span>
                </span>
              ),
            },
            { encabezado: "Grupo", celda: (d) => d.grupoNombre },
            { encabezado: "Cuotas vencidas", celda: (d) => d.cuotasVencidas },
            { encabezado: "Deuda total", celda: (d) => `S/ ${d.deudaTotal}` },
          ]}
          filas={(deudores.data ?? []).map((d) => ({ ...d, id: `${d.usuarioId}-${d.grupoId}` }))}
        />
      </div>
    </Card>
  );
}

/** §13 Asesores: catálogo, nuevo asesor y activar/desactivar. */
export function AsesoresPage() {
  const avisar = useToast();
  const query = useAsesores();
  const crear = useCrearAsesor();
  const toggle = useToggleAsesor();
  const [form, setForm] = useState(false);
  const [f, setF] = useState({
    dni: "",
    nombres: "",
    apellidos: "",
    email: "",
    telefono: "",
    grado: "",
  });
  const items = query.data ?? [];

  async function onCrear(): Promise<void> {
    if (!/^\d{8}$/.test(f.dni)) {
      avisar("DNI debe tener 8 dígitos", "aviso");
      return;
    }
    try {
      await crear.mutateAsync({
        ...f,
        telefono: f.telefono || undefined,
        grado: f.grado || undefined,
      });
      setF({ dni: "", nombres: "", apellidos: "", email: "", telefono: "", grado: "" });
      setForm(false);
      avisar("Asesor registrado");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo crear", "error");
    }
  }

  return (
    <AppShell activo="/asesores">
      <PageHeader
        titulo="Asesores"
        descripcion="Catálogo y gestión de responsables."
        acciones={
          <span className="flex gap-2">
            <Button variante="contorno" onClick={() => void query.refetch()} type="button">
              <RotateCw size={15} />
              RECARGAR
            </Button>
            <Button variante="oscuro" onClick={() => setForm((v) => !v)} type="button">
              <Plus size={16} />
              Nuevo asesor
            </Button>
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <StatCard
          etiqueta="Asesores"
          valor={items.length}
          icono={<Users size={20} />}
          acento="bg-navy-950"
        />
        <StatCard
          etiqueta="Activos"
          valor={items.filter((a) => a.activo).length}
          icono={<Users size={20} />}
          acento="bg-verde-inst-700"
        />
        <StatCard
          etiqueta="Talleres asignados"
          valor={items.reduce((n, a) => n + a.talleres, 0)}
          icono={<GraduationCap size={20} />}
          acento="bg-dorado-500"
        />
      </div>
      {form && (
        <Card>
          <CardEncabezado titulo="Nuevo asesor" />
          <div className="space-y-3 p-4 md:p-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                aria-label="DNI"
                className={cn(controlClase, "h-10")}
                placeholder="DNI"
                value={f.dni}
                onChange={(e) => setF({ ...f, dni: e.target.value })}
              />
              <input
                aria-label="Nombres"
                className={cn(controlClase, "h-10")}
                placeholder="Nombres"
                value={f.nombres}
                onChange={(e) => setF({ ...f, nombres: e.target.value })}
              />
              <input
                aria-label="Apellidos"
                className={cn(controlClase, "h-10")}
                placeholder="Apellidos y nombres"
                value={f.apellidos}
                onChange={(e) => setF({ ...f, apellidos: e.target.value })}
              />
              <input
                aria-label="Correo"
                className={cn(controlClase, "h-10")}
                placeholder="asesor@unsa.edu.pe"
                value={f.email}
                onChange={(e) => setF({ ...f, email: e.target.value })}
              />
              <input
                aria-label="Teléfono"
                className={cn(controlClase, "h-10")}
                placeholder="Teléfono"
                value={f.telefono}
                onChange={(e) => setF({ ...f, telefono: e.target.value })}
              />
              <input
                aria-label="Grado"
                className={cn(controlClase, "h-10")}
                placeholder="Grado (Dr./Mg.)"
                value={f.grado}
                onChange={(e) => setF({ ...f, grado: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button variante="contorno" onClick={() => setForm(false)} type="button">
                CANCELAR
              </Button>
              <Button
                variante="oscuro"
                disabled={crear.isPending}
                onClick={() => void onCrear()}
                type="button"
              >
                GUARDAR ASESOR
              </Button>
            </div>
          </div>
        </Card>
      )}
      <DataTable
        cargando={query.isPending}
        vacio="No existen asesores registrados."
        columnas={[
          {
            encabezado: "Asesor",
            celda: (a) => (
              <span>
                <span className="font-medium">
                  {a.nombres} {a.apellidos}
                </span>
                <br />
                <span className="text-xs tabular-nums text-grafito-600">
                  DNI {a.dni} · {a.email}
                </span>
              </span>
            ),
          },
          { encabezado: "Grado", celda: (a) => a.grado ?? "—" },
          { encabezado: "Talleres", celda: (a) => a.talleres },
          {
            encabezado: "Estado",
            celda: (a) => <StatusBadge estado={a.activo ? "ACTIVO" : "CERRADO"} />,
          },
          {
            encabezado: "Acción",
            clase: "text-right",
            celda: (a) => (
              <Button
                tamano="sm"
                variante="contorno"
                onClick={() => toggle.mutate({ id: a.id, activo: !a.activo })}
                type="button"
              >
                {a.activo ? "Desactivar" : "Activar"}
              </Button>
            ),
          },
        ]}
        filas={items}
      />
    </AppShell>
  );
}
