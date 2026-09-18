import { Link } from "@tanstack/react-router";
import { useListarExpedientes } from "../api/expedientes.js";
import { useSession } from "../api/session.js";
import { AppShell } from "../components/layout/app-shell.js";
import { botonClases } from "../components/ui/button.js";
import { DataTable } from "../components/ui/data-table.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { cn } from "../utils/cn.js";

/** Portal del Asesor (asesor.html legacy): alumnos asignados (?vista=mis). */
export function AsesorPage() {
  const { sesion } = useSession();
  const query = useListarExpedientes({ q: "", estado: "", orden: "recientes", vista: "mis" });
  const items = query.data?.items ?? [];

  return (
    <AppShell activo="/asesor">
      <PageHeader
        titulo={`Alumnos asignados — ${sesion?.nombres ?? ""}`}
        descripcion="Talleres y tesistas a tu cargo."
      />
      <DataTable
        cargando={query.isPending}
        vacio="No tienes talleres asignados."
        columnas={[
          {
            encabezado: "ALUMNO",
            celda: (f) => (
              <span>
                {f.tesista}
                <br />
                <span className="text-xs text-grafito-600">DNI {f.dni}</span>
              </span>
            ),
          },
          { encabezado: "EXPEDIENTE", celda: (f) => <strong>{f.codigo}</strong> },
          { encabezado: "ETAPA", celda: (f) => `Etapa ${f.etapaActual}` },
          { encabezado: "ESTADO", celda: (f) => <StatusBadge estado={f.estado} /> },
          {
            encabezado: "ACCIÓN",
            celda: (f) => (
              <Link
                className={cn(botonClases({ variante: "oscuro", tamano: "sm" }))}
                to="/expedientes/$id"
                params={{ id: f.id }}
              >
                REVISAR DOCS
              </Link>
            ),
          },
        ]}
        filas={items}
      />
    </AppShell>
  );
}
