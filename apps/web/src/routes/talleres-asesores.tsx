import { useState } from "react";
import {
  useAsesores,
  useCrearAsesor,
  useCrearTaller,
  useTalleres,
  useToggleAsesor,
} from "../api/catalogos.js";
import { AppShell } from "../components/layout/app-shell.js";
import { DataTable } from "../components/ui/data-table.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";

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
          <button
            className="rounded bg-verde-inst-700 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => setForm((v) => !v)}
            type="button"
          >
            NUEVO TALLER
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["TALLERES", items.length],
          ["ACTIVOS", items.filter((t) => t.estado === "ACTIVO").length],
          ["INSCRITOS", items.reduce((n, t) => n + t.inscritos, 0)],
          ["ASESORES", new Set(items.map((t) => t.asesorNombre).filter(Boolean)).size],
        ].map(([l, v]) => (
          <div className="rounded-lg border bg-white p-4" key={l}>
            <p className="text-xs text-grafito-600">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      {form && (
        <section className="space-y-2 rounded-lg bg-white p-4">
          <h2 className="text-sm font-bold">Nuevo taller</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              aria-label="Nombre del taller"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Nombre del taller"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              aria-label="Periodo"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Periodo (2026-I)"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
            <button
              className="rounded bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={crear.isPending}
              onClick={() => void onCrear()}
              type="button"
            >
              Guardar taller
            </button>
          </div>
        </section>
      )}
      <DataTable
        cargando={query.isPending}
        vacio="No existen talleres registrados."
        columnas={[
          { encabezado: "TALLER", celda: (f) => <strong>{f.nombre}</strong> },
          { encabezado: "ASESOR", celda: (f) => f.asesorNombre ?? "—" },
          { encabezado: "PERIODO", celda: (f) => f.periodo ?? "—" },
          { encabezado: "INSCRITOS", celda: (f) => f.inscritos },
          { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
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
            <button
              className="rounded border bg-white px-4 py-2 text-sm"
              onClick={() => void query.refetch()}
              type="button"
            >
              RECARGAR
            </button>
            <button
              className="rounded bg-navy-950 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setForm((v) => !v)}
              type="button"
            >
              Nuevo asesor
            </button>
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          ["ASESORES", items.length],
          ["ACTIVOS", items.filter((a) => a.activo).length],
          ["TALLERES ASIGNADOS", items.reduce((n, a) => n + a.talleres, 0)],
        ].map(([l, v]) => (
          <div className="rounded-lg border bg-white p-4" key={l}>
            <p className="text-xs text-grafito-600">{l}</p>
            <p className="text-2xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      {form && (
        <section className="space-y-2 rounded-lg bg-white p-4">
          <h2 className="text-sm font-bold">Nuevo asesor</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <input
              aria-label="DNI"
              className="rounded border px-3 py-2 text-sm"
              placeholder="DNI"
              value={f.dni}
              onChange={(e) => setF({ ...f, dni: e.target.value })}
            />
            <input
              aria-label="Nombres"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Nombres"
              value={f.nombres}
              onChange={(e) => setF({ ...f, nombres: e.target.value })}
            />
            <input
              aria-label="Apellidos"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Apellidos y nombres"
              value={f.apellidos}
              onChange={(e) => setF({ ...f, apellidos: e.target.value })}
            />
            <input
              aria-label="Correo"
              className="rounded border px-3 py-2 text-sm"
              placeholder="asesor@unsa.edu.pe"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
            />
            <input
              aria-label="Teléfono"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Teléfono"
              value={f.telefono}
              onChange={(e) => setF({ ...f, telefono: e.target.value })}
            />
            <input
              aria-label="Grado"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Grado (Dr./Mg.)"
              value={f.grado}
              onChange={(e) => setF({ ...f, grado: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => setForm(false)}
              type="button"
            >
              CANCELAR
            </button>
            <button
              className="rounded bg-navy-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={crear.isPending}
              onClick={() => void onCrear()}
              type="button"
            >
              GUARDAR ASESOR
            </button>
          </div>
        </section>
      )}
      <DataTable
        cargando={query.isPending}
        vacio="No existen asesores registrados."
        columnas={[
          {
            encabezado: "ASESOR",
            celda: (a) => (
              <span>
                {a.nombres} {a.apellidos}
                <br />
                <span className="text-xs text-grafito-600">
                  DNI {a.dni} · {a.email}
                </span>
              </span>
            ),
          },
          { encabezado: "GRADO", celda: (a) => a.grado ?? "—" },
          { encabezado: "TALLERES", celda: (a) => a.talleres },
          {
            encabezado: "ESTADO",
            celda: (a) => <StatusBadge estado={a.activo ? "ACTIVO" : "CERRADO"} />,
          },
          {
            encabezado: "ACCIÓN",
            celda: (a) => (
              <button
                className="rounded border px-3 py-1.5 text-xs"
                onClick={() => toggle.mutate({ id: a.id, activo: !a.activo })}
                type="button"
              >
                {a.activo ? "Desactivar" : "Activar"}
              </button>
            ),
          },
        ]}
        filas={items}
      />
    </AppShell>
  );
}
