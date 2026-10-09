import { fechaCorta, useMisCuotas, useSubirComprobante, useTalleres } from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { botonClases } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { DataTable } from "../components/ui/data-table.js";
import { EmptyState } from "../components/ui/empty-state.js";
import { PageHeader } from "../components/ui/page-header.js";
import { StatusBadge } from "../components/ui/status-badge.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

/** P8 Mis pagos: cuotas del taller + comprobante (imagen o PDF, 5 MB). */
export function MisPagosPage() {
  const talleres = useTalleres({});
  const items = (talleres.data?.items ?? []).filter((t) => t.estado === "ACTIVO");
  const actual = items[0] ?? null;

  return (
    <AppShell activo="/mis-pagos">
      <PageHeader titulo="Mis pagos" descripcion="Cuotas de tu taller" />
      {talleres.isPending ? (
        <output aria-label="Cargando" className="block space-y-2">
          {[0].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-white" />
          ))}
        </output>
      ) : !actual ? (
        <EmptyState
          titulo="Sin taller activo"
          descripcion="Cuando tengas cronograma de pensiones, aquí verás tus cuotas."
        />
      ) : (
        <CuotasAlumno tallerId={actual.id} />
      )}
    </AppShell>
  );
}

function CuotasAlumno({ tallerId }: { tallerId: string }) {
  const avisar = useToast();
  const query = useMisCuotas(tallerId);
  const subir = useSubirComprobante(tallerId);
  const filas = query.data?.items ?? [];

  async function onArchivo(cuotaId: string, file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      avisar("El archivo supera los 5 MB", "error");
      return;
    }
    try {
      await subir.mutateAsync({ cuotaId, file });
      avisar("Comprobante enviado: queda en revisión");
    } catch (e) {
      avisar(e instanceof Error ? e.message : "No se pudo subir", "error");
    }
  }

  return (
    <Card>
      <div className="p-4">
        <DataTable
          cargando={query.isPending}
          vacio="No tienes cuotas programadas."
          columnas={[
            { encabezado: "Cuota", celda: (f) => f.nroCuota },
            { encabezado: "Vence", celda: (f) => fechaCorta(f.vencimiento) },
            { encabezado: "Monto (S/)", celda: (f) => f.monto.toFixed(2) },
            {
              encabezado: "Estado",
              celda: (f) =>
                f.estado === "EN_REVISION" ? (
                  <StatusBadge estado={f.estado} etiqueta="EN REVISIÓN" />
                ) : (
                  <StatusBadge estado={f.estado} />
                ),
            },
            {
              encabezado: "Acción",
              celda: (f) => {
                if (f.estado === "PENDIENTE") {
                  return (
                    <label
                      className={cn(
                        botonClases({ variante: "exito", tamano: "sm" }),
                        "cursor-pointer",
                      )}
                    >
                      Subir comprobante
                      <input
                        aria-label={`Comprobante de la cuota ${f.nroCuota}`}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={subir.isPending}
                        onChange={(e) => void onArchivo(f.id, e.target.files?.[0])}
                      />
                    </label>
                  );
                }
                if (f.estado === "OBSERVADO") {
                  return (
                    <label
                      className={cn(
                        botonClases({ variante: "oscuro", tamano: "sm" }),
                        "cursor-pointer",
                      )}
                    >
                      Subir otro
                      <input
                        aria-label={`Otro comprobante de la cuota ${f.nroCuota}`}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        disabled={subir.isPending}
                        onChange={(e) => void onArchivo(f.id, e.target.files?.[0])}
                      />
                    </label>
                  );
                }
                return <span className="text-grafito-600">—</span>;
              },
            },
          ]}
          filas={filas}
        />
        <p className="mt-2 text-xs text-grafito-600">
          Comprobante en imagen o PDF, hasta 5 MB. Si fue observado, aquí se muestra el motivo
          {filas.some((f) => f.estado === "OBSERVADO" && f.motivo)
            ? `: "${filas.find((f) => f.estado === "OBSERVADO" && f.motivo)?.motivo}"`
            : "."}
        </p>
      </div>
    </Card>
  );
}
