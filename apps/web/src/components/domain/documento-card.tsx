import { useRef, useState } from "react";
import { documentoDescargaUrl, useSubirDocumento } from "../../api/expedientes.js";
import { cn } from "../../utils/cn.js";

interface Props {
  expedienteId: string;
  tipo: string;
  nombre: string;
  estado: string;
  version: number | null;
  faltantes: string[];
  documentoId: string | null;
}

const badge: Record<string, string> = {
  PENDIENTE: "bg-yellow-100 text-yellow-800 border-yellow-300",
  CARGADO: "bg-blue-100 text-blue-800 border-blue-300",
  OBSERVADO: "bg-orange-100 text-orange-800 border-orange-300",
  APROBADO: "bg-green-100 text-green-800 border-green-300",
  RECHAZADO: "bg-red-100 text-red-800 border-red-300",
};

/** Tarjeta documental §§7–8: estado + cuadro amarillo + VER + ADJUNTAR/REEMPLAZAR. */
export function DocumentoCard(p: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const subir = useSubirDocumento(p.expedienteId);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return;
    setError(null);
    if (
      p.version !== null &&
      !window.confirm(
        `Reemplazar ${p.nombre} (v${p.version}) por ${file.name}? Se creará la v${p.version + 1}.`,
      )
    ) {
      return;
    }
    try {
      await subir.mutateAsync({ tipo: p.tipo, file });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden>📄</span>
          <h3 className="text-sm font-semibold">{p.nombre}</h3>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs font-semibold",
            badge[p.estado] ?? badge.PENDIENTE,
          )}
        >
          {p.estado.replace("_", " ")}
          {p.version !== null ? ` · v${p.version}` : ""}
        </span>
      </div>
      {p.faltantes.length > 0 && (
        <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-900">
          Campos pendientes: {p.faltantes.join("; ")}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-3 flex gap-2">
        {p.documentoId ? (
          <a
            className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            href={documentoDescargaUrl(p.documentoId)}
            target="_blank"
            rel="noreferrer"
          >
            VER
          </a>
        ) : (
          <span className="rounded bg-slate-100 px-3 py-1.5 text-xs text-slate-400">VER</span>
        )}
        <button
          className="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50"
          disabled={subir.isPending}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {subir.isPending ? "SUBIENDO…" : p.version === null ? "ADJUNTAR" : "REEMPLAZAR"}
        </button>
        <input
          accept="application/pdf"
          className="hidden"
          ref={inputRef}
          type="file"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
