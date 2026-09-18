import { Link } from "@tanstack/react-router";
import { useListarExpedientes } from "../api/expedientes.js";
import { useSession } from "../api/session.js";
import { AppShell } from "../components/layout/app-shell.js";
import { DataTable } from "../components/ui/data-table.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";

/** Portal del Asesor (asesor.html legacy): alumnos y talleres asignados. */
export function AsesorPage() {
  const { sesion } = useSession();
  const query = useListarExpedientes({ q: "", estado: "", orden: "recientes" });
  // Demo: el asesor de prueba ve SET005. Fase RF: /api/expedientes?asesor=mio.
  const items = (query.data?.items ?? []).filter(() => sesion?.dni === "87654321");

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
                className="rounded bg-navy-950 px-3 py-1.5 text-xs font-semibold text-white"
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
