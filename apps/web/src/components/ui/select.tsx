import { type ReactNode, useId } from "react";
import { cn } from "../../utils/cn.js";

/**
 * Select §14.1 con altura unificada (h-9, igual que los inputs) y chevron
 * propio: el <select> nativo renderiza con box-model distinto según el
 * navegador y se veía desalineado junto a los inputs.
 */
export function Select({
  label,
  value,
  onChange,
  children,
  ariaLabel,
}: {
  label?: string;
  value: string;
  onChange?: ((v: string) => void) | undefined;
  children: ReactNode;
  ariaLabel?: string;
}) {
  const id = useId();
  return (
    <div className="block">
      {label && (
        <label
          className="mb-1 block text-[11px] font-bold tracking-wider text-grafito-600 uppercase"
          htmlFor={id}
        >
          {label}
        </label>
      )}
      <span className={cn("relative block h-9", label && "mt-1")}>
        <select
          aria-label={ariaLabel ?? label}
          className="h-9 w-full appearance-none rounded-lg border border-slate-300 bg-white pr-8 pl-3 text-sm shadow-card transition-colors hover:border-slate-400 focus:border-navy-800"
          id={id}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          {children}
        </select>
        <svg
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-grafito-600"
          role="img"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <title>Desplegar opciones</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </div>
  );
}
