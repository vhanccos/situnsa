import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn.js";

type Variante = "primario" | "oscuro" | "contorno" | "peligro" | "fantasma";

const estilos: Record<Variante, string> = {
  primario: "bg-guinda-800 text-white hover:bg-guinda-700 active:bg-guinda-800 disabled:opacity-60",
  oscuro: "bg-navy-950 text-white hover:bg-navy-800 active:bg-navy-950 disabled:opacity-60",
  contorno: "border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-60",
  peligro: "bg-red-700 text-white hover:bg-red-800 active:bg-red-700 disabled:opacity-60",
  fantasma: "text-navy-800 underline-offset-2 hover:underline",
};

/** Botón institucional §14.1: variantes + estados coherentes en toda la app. */
export function Button({
  variante = "primario",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors",
        estilos[variante],
        className,
      )}
      {...rest}
    />
  );
}
