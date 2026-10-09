import { Link } from "@tanstack/react-router";
import { GraduationCap, Plus, RotateCw, Users } from "lucide-react";
import { useState } from "react";
import { useAsesores, useCrearAsesor, useToggleAsesor } from "../api/catalogos.js";
import { diasHora, useTalleres } from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card, CardEncabezado } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { controlClase } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { StatCard } from "../components/ui/stat-card.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

/** P1 Lista de talleres: filtros combinables y tabla (RF-0200). */
export function TalleresPage() {
  const [periodo, setPeriodo] = useState("");
  const [estado, setEstado] = useState("");
  const [asesorDni, setAsesorDni] = useState("");
  const query = useTalleres({
    ...(periodo ? { periodo } : {}),
    ...(estado ? { estado } : {}),
    ...(asesorDni ? { asesorDni } : {}),
  });
  const opciones = useTalleres({
    ...(estado ? { estado } : {}),
    ...(asesorDni ? { asesorDni } : {}),
  });
  const asesores = useAsesores();
  const items = query.data?.items ?? [];
  const periodos: string[] = [
    ...new Set(
      (opciones.data?.items ?? []).map((t) => t.periodo).filter((p): p is string => p !== null),
    ),
  ].sort();
  const conFiltros = periodo !== "" || estado !== "" || asesorDni !== "";

  return (
    <AppShell activo="/talleres">
      <PageHeader
        titulo="Talleres de Tesis"
        descripcion="Administración de inscripciones, talleres, asesores, avance y asistencia."
        acciones={
          <Link className={cn("inline-flex")} to="/talleres/nuevo">
            <Button variante="exito" type="button">
              <Plus size={16} />
              NUEVO TALLER
            </Button>
          </Link>
        }
      />
      <Card>
        <div className="grid grid-cols-1 gap-2 p-4 md:grid-cols-3 md:p-5">
          <Select label="PERÍODO" value={periodo} onChange={setPeriodo}>
            <option value="">Todos</option>
            {periodos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
          <Select label="ESTADO" value={estado} onChange={setEstado}>
            <option value="">Todos</option>
            <option value="ACTIVO">ACTIVO</option>
            <option value="CERRADO">CERRADO</option>
            <option value="CANCELADO">CANCELADO</option>
          </Select>
          <Select label="ASESOR" value={asesorDni} onChange={setAsesorDni}>
            <option value="">Todos</option>
            {(asesores.data ?? []).map((a) => (
              <option key={a.id} value={a.dni}>
                {a.nombres} {a.apellidos}
              </option>
            ))}
          </Select>
        </div>
      </Card>
      {items.length === 0 && !query.isPending ? (
        conFiltros ? (
          <EmptyState
            titulo="Sin resultados"
            descripcion="Ajusta los filtros para ver más talleres."
          />
        ) : (
          <EmptyState
            titulo="Aún no hay talleres. Crea el primero"
            accion={
              <Link to="/talleres/nuevo">
                <Button variante="oscuro" type="button">
                  <Plus size={16} />
                  Nuevo taller
                </Button>
              </Link>
            }
          />
        )
      ) : (
        <DataTable
          cargando={query.isPending}
          vacio="No existen talleres registrados."
          columnas={[
            { encabezado: "Taller", celda: (f) => <strong>{f.nombre}</strong> },
            { encabezado: "Asesor", celda: (f) => f.asesorNombre ?? "—" },
            { encabezado: "Período", celda: (f) => f.periodo ?? "—" },
            { encabezado: "Días y hora", celda: (f) => diasHora(f) },
            {
              encabezado: "Cupo",
              celda: (f) => (f.cupoMax !== null ? `${f.inscritos}/${f.cupoMax}` : `${f.inscritos}`),
            },
            {
              encabezado: "Sesiones",
              celda: (f) => `${f.sesiones.realizadas}/${f.sesiones.total}`,
            },
            { encabezado: "Estado", celda: (f) => <StatusBadge estado={f.estado} /> },
            {
              encabezado: "Acciones",
              celda: (f) => (
                <Link to="/taller/$id" params={{ id: f.id }}>
                  <Button tamano="sm" variante="contorno" type="button">
                    Ver
                  </Button>
                </Link>
              ),
            },
          ]}
          filas={items}
        />
      )}
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
