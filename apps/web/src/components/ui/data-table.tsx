import type { ReactNode } from "react";
import { cn } from "../../utils/cn.js";
import { EmptyState } from "./empty-state.js";

export interface Columna<T> {
  encabezado: string;
  celda: (fila: T) => ReactNode;
  clase?: string;
}

/**
 * DataTable: encabezado navy fijo, filas con hover, estado vacío diseñado.
 * Responsive: scroll horizontal contenido.
 */
export function DataTable<T extends { id: string }>({
  columnas,
  filas,
  vacio,
  cargando,
}: {
  columnas: Array<Columna<T>>;
  filas: T[];
  vacio: ReactNode;
  cargando?: boolean;
}) {
  if (cargando) {
    return (
      <output
        className="block space-y-2 rounded-xl border border-slate-200/80 bg-white p-4 shadow-card"
        aria-label="Cargando"
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            className="h-11 animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-200/60 to-slate-100"
            key={i}
          />
        ))}
      </output>
    );
  }
  if (filas.length === 0) {
    return typeof vacio === "string" ? (
      <EmptyState titulo={vacio} />
    ) : (
      <div className="[display:contents]">{vacio}</div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-card">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead className="sticky top-0">
          <tr className="tira-institucional text-white">
            {columnas.map((c) => (
              <th
                className={cn(
                  "px-4 py-2.5 text-[11px] font-bold tracking-wider whitespace-nowrap uppercase first:rounded-tl-xl last:rounded-tr-xl",
                  c.clase,
                )}
                key={c.encabezado}
                scope="col"
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              className="border-t border-slate-200/70 transition-colors first:border-t-0 hover:bg-navy-950/[0.025]"
              key={f.id}
            >
              {columnas.map((c) => (
                <td className={cn("px-4 py-3 align-middle", c.clase)} key={c.encabezado}>
                  {c.celda(f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
