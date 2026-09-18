import type { ReactNode } from "react";
import { Card } from "./card.js";

/** StatCard: indicador con icono en pastilla, cifra tabular y pie opcional. */
export function StatCard({
  etiqueta,
  valor,
  icono,
  acento,
  pie,
}: {
  etiqueta: string;
  valor: ReactNode;
  icono: ReactNode;
  acento: string;
  pie?: ReactNode;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <span className={`absolute inset-x-0 top-0 h-1 ${acento}`} aria-hidden />
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy-950/[0.06] text-navy-800">
          {icono}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold tracking-wider text-grafito-600 uppercase">
            {etiqueta}
          </p>
          <p className="text-2xl leading-8 font-bold tabular-nums text-navy-950">{valor}</p>
        </div>
      </div>
      {pie && <div className="mt-2 text-xs text-grafito-600">{pie}</div>}
    </Card>
  );
}
