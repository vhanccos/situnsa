import { type ReactNode, useId } from "react";

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
        <label className="text-xs font-medium text-grafito-600" htmlFor={id}>
          {label}
        </label>
      )}
      <span className="relative mt-1 block h-9">
        <select
          aria-label={ariaLabel ?? label}
          className="h-9 w-full appearance-none rounded border bg-white px-2 pr-8 text-sm"
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
