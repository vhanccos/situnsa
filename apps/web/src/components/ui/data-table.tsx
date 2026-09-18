import type { ReactNode } from "react";
import { cn } from "../../utils/cn.js";

export interface Columna<T> {
  encabezado: string;
  celda: (fila: T) => ReactNode;
  clase?: string;
}

/**
 * DataTable §14.1: encabezados persistentes, filas legibles, estado vacío y
 * versión responsive (scroll horizontal contenido + columna principal fija).
 */
export function DataTable<T extends { id: string }>({
  columnas,
  filas,
  vacio,
  cargando,
}: {
  columnas: Array<Columna<T>>;
  filas: T[];
  vacio: string;
  cargando?: boolean;
}) {
  if (cargando) {
    return (
      <output className="block space-y-2 rounded-lg border bg-white p-4" aria-label="Cargando">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
        ))}
      </output>
    );
  }
  if (filas.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-sm text-grafito-600">{vacio}</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="bg-navy-950 text-white">
            {columnas.map((c) => (
              <th
                className={cn("px-3 py-2 text-xs font-semibold", c.clase)}
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
            <tr className="border-t hover:bg-slate-50" key={f.id}>
              {columnas.map((c) => (
                <td className={cn("px-3 py-2 align-top", c.clase)} key={c.encabezado}>
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
