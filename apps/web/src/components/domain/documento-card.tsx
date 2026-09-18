import { AlertTriangle, Eye, FileText, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { documentoDescargaUrl, useSubirDocumento } from "../../api/expedientes.js";
import { cn } from "../../utils/cn.js";
import { botonClases } from "../ui/button.js";
import { Card } from "../ui/card.js";
import { ConfirmDialog } from "../ui/confirm-dialog.js";
import { StatusBadge } from "../ui/status-badge.js";

interface Props {
  expedienteId: string;
  tipo: string;
  nombre: string;
  estado: string;
  version: number | null;
  faltantes: string[];
  documentoId: string | null;
}

/** Tarjeta documental §§7–8: estado + faltantes + VER + ADJUNTAR/REEMPLAZAR + dropzone. */
export function DocumentoCard(p: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const subir = useSubirDocumento(p.expedienteId);
  const [error, setError] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [pendiente, setPendiente] = useState<File | null>(null);

  async function ejecutar(file: File): Promise<void> {
    setError(null);
    try {
      await subir.mutateAsync({ tipo: p.tipo, file });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir");
    }
  }

  function onFile(file: File | undefined): void {
    if (!file) return;
    if (p.version !== null) {
      setPendiente(file);
      return;
    }
    void ejecutar(file);
  }

  return (
    <Card
      className={cn(
        "p-4 transition-colors",
        arrastrando && "border-dashed border-navy-800 bg-navy-950/[0.03]",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        onFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-950/[0.06] text-navy-800">
            <FileText size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-navy-950">{p.nombre}</h3>
            <p className="text-xs text-grafito-600">
              {p.tipo}
              {p.version !== null ? ` · v${p.version}` : ""}
            </p>
          </div>
        </div>
        <StatusBadge estado={p.estado} />
      </div>
      {p.faltantes.length > 0 && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-aviso-100 px-2.5 py-2 text-xs text-aviso-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            <strong>Campos pendientes:</strong> {p.faltantes.join("; ")}
          </span>
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-3">
        {p.documentoId ? (
          <a
            className={cn(botonClases({ variante: "oscuro", tamano: "sm" }))}
            href={documentoDescargaUrl(p.documentoId)}
            target="_blank"
            rel="noreferrer"
          >
            <Eye size={14} />
            VER
          </a>
        ) : (
          <span
            className={cn(
              botonClases({ variante: "contorno", tamano: "sm" }),
              "pointer-events-none opacity-50",
            )}
            aria-disabled
          >
            <Eye size={14} />
            VER
          </span>
        )}
        <button
          className={cn(botonClases({ variante: "contorno", tamano: "sm" }))}
          disabled={subir.isPending}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <UploadCloud size={14} />
          {subir.isPending ? "SUBIENDO…" : p.version === null ? "ADJUNTAR" : "REEMPLAZAR"}
        </button>
        <input
          accept="application/pdf"
          className="hidden"
          ref={inputRef}
          type="file"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {pendiente && (
        <ConfirmDialog
          titulo="Reemplazar documento"
          mensaje={`Reemplazar ${p.nombre} (v${p.version}) por ${pendiente.name}? Se creará la v${(p.version ?? 0) + 1}.`}
          confirmar="Reemplazar"
          onConfirmar={() => {
            const f = pendiente;
            setPendiente(null);
            void ejecutar(f);
          }}
          onCancelar={() => setPendiente(null)}
        />
      )}
    </Card>
  );
}
