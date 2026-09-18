import type { ReactNode } from "react";

/** PageHeader §14.1: título + descripción + expediente/taller activo + acciones. */
export function PageHeader({
  titulo,
  descripcion,
  insignia,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  insignia?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-grafito-900">{titulo}</h1>
        {descripcion && <p className="text-sm text-grafito-600">{descripcion}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {insignia}
        {acciones}
      </div>
    </header>
  );
}
