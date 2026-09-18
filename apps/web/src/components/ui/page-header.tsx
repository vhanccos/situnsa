import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

/** Miga de pan: [etiqueta, href?]. Último elemento = página actual. */
export type Miga = { etiqueta: string; href?: string };

/**
 * PageHeader: miga + título + descripción + insignias/meta + acciones.
 * Da contexto ("dónde estoy") a cada vista.
 */
export function PageHeader({
  titulo,
  descripcion,
  migas,
  insignia,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  migas?: Miga[];
  insignia?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      {migas && migas.length > 0 && (
        <nav aria-label="Miga de pan">
          <ol className="flex flex-wrap print:hidden items-center gap-1 text-xs text-grafito-600">
            {migas.map((m, i) => {
              const ultima = i === migas.length - 1;
              return (
                <li className="flex items-center gap-1" key={m.etiqueta}>
                  {i > 0 && <ChevronRight size={12} aria-hidden />}
                  {m.href && !ultima ? (
                    <a className="font-medium hover:text-navy-950 hover:underline" href={m.href}>
                      {m.etiqueta}
                    </a>
                  ) : (
                    <span aria-current={ultima ? "page" : undefined} className="font-semibold">
                      {m.etiqueta}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-navy-950 md:text-2xl">{titulo}</h1>
          {descripcion && <p className="mt-0.5 text-sm text-grafito-600">{descripcion}</p>}
        </div>
        {(insignia || acciones) && (
          <div className="flex flex-wrap items-center gap-2">
            {insignia}
            {acciones}
          </div>
        )}
      </div>
    </header>
  );
}
