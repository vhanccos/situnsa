import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn.js";

/** Card institucional: superficie blanca con elevación suave y borde tenue. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl border border-slate-200/80 bg-white shadow-card", className)}
      {...rest}
    />
  );
}

/** Encabezado de card con tira institucional opcional. */
export function CardEncabezado({
  titulo,
  descripcion,
  accion,
  tira = false,
  className,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  accion?: ReactNode;
  tira?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-3 md:px-5",
        tira && "rounded-t-xl border-b-0 bg-navy-950 text-white [&_p]:text-navy-100",
        className,
      )}
    >
      <div>
        <h2
          className={cn("text-sm font-bold tracking-wide", tira ? "text-white" : "text-navy-950")}
        >
          {titulo}
        </h2>
        {descripcion && <p className="mt-0.5 text-xs text-grafito-600">{descripcion}</p>}
      </div>
      {accion}
    </div>
  );
}
