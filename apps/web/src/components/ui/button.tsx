import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../utils/cn.js";

const boton = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-navy-800 focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55 [&_svg]:shrink-0",
  {
    variants: {
      variante: {
        primario:
          "bg-guinda-800 text-white shadow-card hover:bg-guinda-700 hover:shadow-elevado active:bg-guinda-800",
        oscuro: "bg-navy-950 text-white shadow-card hover:bg-navy-800 hover:shadow-elevado",
        contorno:
          "border border-slate-300 bg-white text-grafito-900 shadow-card hover:border-slate-400 hover:bg-slate-50",
        peligro: "bg-red-700 text-white shadow-card hover:bg-red-800",
        exito: "bg-verde-inst-700 text-white shadow-card hover:brightness-110",
        fantasma: "text-navy-800 hover:bg-navy-950/5",
        dorado: "bg-dorado-500 text-navy-950 shadow-card hover:brightness-105",
      },
      tamano: {
        xs: "h-7 px-2.5 text-xs",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-base",
        icono: "h-9 w-9",
      },
    },
    defaultVariants: { variante: "primario", tamano: "md" },
  },
);

/** Clases del botón para <Link> con apariencia de botón. */
export const botonClases = boton;

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof boton>;

/** Botón institucional: variantes CVA + tamaños + foco accesible. */
export function Button({ variante, tamano, className, ...rest }: BotonProps) {
  return <button className={cn(boton({ variante, tamano }), className)} {...rest} />;
}
