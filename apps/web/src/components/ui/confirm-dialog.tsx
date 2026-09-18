import { useEffect, useRef } from "react";

/** ConfirmDialog §14.1: acciones sensibles (resetear, eliminar, finalizar, validar). */
export function ConfirmDialog({
  titulo,
  mensaje,
  confirmar,
  cancelar,
  onConfirmar,
  onCancelar,
  peligroso,
}: {
  titulo: string;
  mensaje: string;
  confirmar: string;
  cancelar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  peligroso?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div
      aria-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-label={titulo}
    >
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold">{titulo}</h2>
        <p className="mt-2 text-sm text-grafito-600">{mensaje}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            onClick={onCancelar}
            type="button"
          >
            {cancelar ?? "Cancelar"}
          </button>
          <button
            className={
              peligroso
                ? "rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                : "rounded bg-navy-950 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            }
            onClick={onConfirmar}
            ref={btnRef}
            type="button"
          >
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
