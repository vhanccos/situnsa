import type { ReactNode } from "react";
import { Card, CardEncabezado } from "./card.js";

/**
 * FormSection: sección numerada de formulario (icono + título + ayuda).
 * Rompe el "muro de campos" en bloques escaneables.
 */
export function FormSection({
  numero,
  icono,
  titulo,
  ayuda,
  accion,
  children,
  className,
}: {
  numero?: string;
  icono?: ReactNode;
  titulo: string;
  ayuda?: string;
  accion?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardEncabezado
        titulo={
          <span className="flex items-center gap-2.5">
            {numero && (
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md bg-navy-950 text-[11px] font-bold text-white"
                aria-hidden
              >
                {numero}
              </span>
            )}
            {icono && <span className="text-navy-800">{icono}</span>}
            {titulo}
          </span>
        }
        descripcion={ayuda}
        accion={accion}
      />
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-4">
        {children}
      </div>
    </Card>
  );
}
