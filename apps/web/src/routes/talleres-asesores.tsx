import { GraduationCap, Plus, RotateCw, Users } from "lucide-react";
import { useState } from "react";
import {
  useAsesores,
  useCrearAsesor,
  useCrearTaller,
  useTalleres,
  useToggleAsesor,
} from "../api/catalogos.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
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
    </AppShell>
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
