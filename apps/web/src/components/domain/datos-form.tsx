import type { ActualizarDatosInput, ExpedienteDetalleDTO } from "@pis/contracts";
import { useEffect, useRef, useState } from "react";
import { type GuardadoEstado, useActualizarDatos } from "../../api/expedientes.js";
import { cn } from "../../utils/cn.js";

function Campo({
  label,
  value,
  onChange,
  readOnly,
  type,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <input
        className={cn(
          "mt-1 w-full rounded border px-2 py-1.5 text-sm",
          readOnly ? "bg-slate-50 text-slate-500" : "bg-white",
        )}
        readOnly={readOnly}
        type={type ?? "text"}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </label>
  );
}

/**
 * Pestaña Datos §6: formulario administrativo con autoguardado (debounce),
 * indicador Guardando…/Guardado/Error y aviso de concurrencia (409).
 */
export function DatosForm({
  detalle,
  setEstado,
  onConflicto,
}: {
  detalle: ExpedienteDetalleDTO;
  setEstado: (e: GuardadoEstado) => void;
  onConflicto: (msg: string) => void;
}) {
  const p1 = detalle.participante1;
  const [titulo, setTitulo] = useState(detalle.titulo);
  const [programa, setPrograma] = useState(detalle.programa);
  const [email, setEmail] = useState(p1?.email ?? "");
  const [cui, setCui] = useState(p1?.cui ?? "");
  const [telefono, setTelefono] = useState(p1?.telefono ?? "");
  const tokenRef = useRef(detalle.updatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutate = useActualizarDatos(detalle.id);

  // Sincroniza cuando llega data fresca (carga inicial, refetch post-conflicto).
  useEffect(() => {
    setTitulo(detalle.titulo);
    setPrograma(detalle.programa);
    setEmail(detalle.participante1?.email ?? "");
    setCui(detalle.participante1?.cui ?? "");
    setTelefono(detalle.participante1?.telefono ?? "");
    tokenRef.current = detalle.updatedAt;
  }, [detalle]);

  function programaGuardado(patch: ActualizarDatosInput): void {
    if (timer.current) clearTimeout(timer.current);
    setEstado("editando");
    timer.current = setTimeout(() => {
      setEstado("guardando");
      mutate.mutate(
        { ...patch, expectedUpdatedAt: tokenRef.current },
        {
          onSuccess: (data) => {
            tokenRef.current = data.updatedAt;
            setEstado("guardado");
          },
          onError: (e) => {
            if ((e as Error & { conflicto?: boolean }).conflicto) {
              setEstado("conflicto");
              onConflicto(e.message);
            } else {
              setEstado("error");
            }
          },
        },
      );
    }, 800);
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-500">ETAPA 01</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Campo
            label="NOMBRES"
            readOnly
            value={`${p1?.nombres ?? ""} ${p1?.apellidos ?? ""}`.trim()}
          />
          <Campo
            label="PROGRAMA"
            value={programa}
            onChange={(v) => {
              setPrograma(v);
              programaGuardado({ programa: v });
            }}
          />
          <div className="md:col-span-2">
            <Campo
              label="TESIS (título)"
              value={titulo}
              onChange={(v) => {
                setTitulo(v);
                programaGuardado({ titulo: v });
              }}
            />
          </div>
          <Campo label="DNI" readOnly value={p1?.dni ?? ""} />
          <Campo label="MODALIDAD" readOnly value={detalle.modalidad} />
          <Campo
            label="CORREO"
            type="email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              programaGuardado({ participante1Email: v });
            }}
          />
          <Campo
            label="CUI"
            value={cui}
            onChange={(v) => {
              setCui(v);
              programaGuardado({ participante1Cui: v });
            }}
          />
          <Campo
            label="TELÉFONO"
            value={telefono}
            onChange={(v) => {
              setTelefono(v);
              programaGuardado({ participante1Telefono: v });
            }}
          />
          <Campo
            label="ASESOR"
            readOnly
            value={detalle.asesor ? `${detalle.asesor.nombres} ${detalle.asesor.apellidos}` : ""}
          />
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-sm font-bold tracking-wide text-slate-500">
          ETAPA 02 <span className="font-normal">(sorteo de jurados — RF-04, próxima fase)</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Campo label="PRESIDENTE ETAPA 02" readOnly value="" />
          <Campo label="SECRETARIO ETAPA 02" readOnly value="" />
          <Campo label="FECHA SUSTENTACIÓN" readOnly value="" />
          <Campo label="LUGAR SUSTENTACIÓN" readOnly value="" />
        </div>
      </section>
    </div>
  );
}
