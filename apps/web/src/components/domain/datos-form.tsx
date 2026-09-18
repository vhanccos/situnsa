import type { ActualizarDatosInput, ExpedienteDetalleDTO } from "@pis/contracts";
import { useEffect, useRef, useState } from "react";
import { type GuardadoEstado, useActualizarDatos } from "../../api/expedientes.js";
import { cn } from "../../utils/cn.js";

function Campo({
  label,
  value,
  onChange,
  readOnly,
  tipo,
}: {
  label: string;
  value: string;
  onChange?: ((v: string) => void) | undefined;
  readOnly?: boolean;
  tipo?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-grafito-600">{label}</span>
      <input
        className={cn(
          "mt-1 w-full rounded border px-2 py-1.5 text-sm",
          readOnly ? "bg-slate-50 text-slate-500" : "bg-white",
        )}
        readOnly={readOnly}
        type={tipo ?? "text"}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </label>
  );
}

type ClavePatch = keyof ActualizarDatosInput;

/** Secciones del formulario legacy (labels exactos de Dashboard.html). */
const SECCIONES: Array<{
  titulo: string;
  campos: Array<{ clave: ClavePatch | null; label: string; soloLectura?: string }>;
}> = [
  {
    titulo: "ETAPA 01 · DATOS PERSONALES",
    campos: [
      { clave: null, label: "NOMBRES", soloLectura: "p1nombre" },
      { clave: "programa", label: "PROGRAMAS" },
      { clave: "titulo", label: "TESIS" },
      { clave: null, label: "DNI", soloLectura: "p1dni" },
      { clave: null, label: "MODALIDAD", soloLectura: "modalidad" },
      { clave: "participante1Email", label: "CORREO" },
      { clave: "participante1Cui", label: "CUI" },
      { clave: "participante1Nacionalidad", label: "NACIONALIDAD" },
      { clave: "participante1Ciudad", label: "CIUDAD" },
      { clave: "participante1Telefono", label: "TELÉFONO" },
      { clave: "participante1Direccion", label: "DIRECCIÓN" },
    ],
  },
  {
    titulo: "ETAPA 01 · SEGUNDO PARTICIPANTE",
    campos: [
      { clave: null, label: "NOMBRES 02", soloLectura: "p2nombre" },
      { clave: null, label: "DNI 02", soloLectura: "p2dni" },
      { clave: "participante2Email", label: "CORREO 02" },
      { clave: "participante2Cui", label: "CUI 02" },
      { clave: "participante2Nacionalidad", label: "NACIONALIDAD 02" },
      { clave: "participante2Ciudad", label: "CIUDAD 02" },
      { clave: "participante2Telefono", label: "TELÉFONO 02" },
      { clave: "participante2Direccion", label: "DIRECCIÓN 02" },
    ],
  },
  {
    titulo: "ETAPA 01 · ADMINISTRATIVOS",
    campos: [
      { clave: "nroDecreto", label: "N° DECRETO" },
      { clave: "recomendacion", label: "RECOMENDACIÓN" },
      { clave: "presidente", label: "PRESIDENTE" },
      { clave: null, label: "ASESOR", soloLectura: "asesor" },
      { clave: "secretario", label: "SECRETARIO" },
      { clave: "coAsesor", label: "CO ASESOR" },
      { clave: "fechaApertura", label: "FECHA APERTURA" },
      { clave: "fechaPresentacion", label: "FECHA PRESENTACIÓN" },
      { clave: "nroOficio", label: "N° OFICIO" },
    ],
  },
  {
    titulo: "ETAPA 02 · SUSTENTACIÓN",
    campos: [
      { clave: "integrante", label: "INTEGRANTE" },
      { clave: "presidenteE2", label: "PRESIDENTE ETAPA 02" },
      { clave: "secretarioE2", label: "SECRETARIO ETAPA 02" },
      { clave: "suplenteE2", label: "SUPLENTE ETAPA 02" },
      { clave: "decanal", label: "DECANAL" },
      { clave: "fechaSustentacion", label: "FECHA" },
      { clave: "horaSustentacion", label: "HORA" },
      { clave: "lugarSustentacion", label: "LUGAR SUSTENTACIÓN" },
      { clave: "modalidadVirtual", label: "MODALIDAD VIRTUAL" },
    ],
  },
];

/**
 * Pestaña Datos §6: formulario administrativo completo con autoguardado
 * (debounce), indicador Guardando…/Guardado/Error y aviso de concurrencia.
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
  const [valores, setValores] = useState<Record<string, string>>(() => extraer(detalle));
  const tokenRef = useRef(detalle.updatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mutate = useActualizarDatos(detalle.id);

  useEffect(() => {
    setValores(extraer(detalle));
    tokenRef.current = detalle.updatedAt;
  }, [detalle]);

  function lectura(key: string): string {
    const p1 = detalle.participante1;
    const p2 = detalle.participante2;
    switch (key) {
      case "p1nombre":
        return `${p1?.nombres ?? ""} ${p1?.apellidos ?? ""}`.trim() || "—";
      case "p1dni":
        return p1?.dni ?? "—";
      case "modalidad":
        return detalle.modalidad;
      case "p2nombre":
        return p2 ? `${p2.nombres} ${p2.apellidos}`.trim() : "—";
      case "p2dni":
        return p2?.dni ?? "—";
      case "asesor":
        return detalle.asesor ? `${detalle.asesor.nombres} ${detalle.asesor.apellidos}` : "—";
      default:
        return "";
    }
  }

  function editar(clave: ClavePatch, v: string): void {
    setValores((prev) => ({ ...prev, [clave]: v }));
    if (timer.current) clearTimeout(timer.current);
    setEstado("editando");
    timer.current = setTimeout(() => {
      setEstado("guardando");
      mutate.mutate({ [clave]: v, expectedUpdatedAt: tokenRef.current } as ActualizarDatosInput, {
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
      });
    }, 800);
  }

  const hayP2 = detalle.participante2 !== null;

  return (
    <div className="space-y-6">
      {SECCIONES.filter((s) => hayP2 || !s.titulo.includes("SEGUNDO")).map((sec) => (
        <section key={sec.titulo}>
          <h2 className="mb-3 text-sm font-bold tracking-wide text-grafito-600">{sec.titulo}</h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {sec.campos.map((c) => (
              <Campo
                key={c.label}
                label={c.label}
                readOnly={c.clave === null}
                value={c.clave === null ? lectura(c.soloLectura ?? "") : (valores[c.clave] ?? "")}
                onChange={c.clave === null ? undefined : (v) => editar(c.clave as ClavePatch, v)}
                tipo={
                  c.label.startsWith("FECHA")
                    ? "date"
                    : c.label === "CORREO" || c.label === "CORREO 02"
                      ? "email"
                      : "text"
                }
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function extraer(d: ExpedienteDetalleDTO): Record<string, string> {
  const p1 = d.participante1;
  const p2 = d.participante2;
  const admin = d.datosAdmin as Record<string, string | null>;
  const get = (v: string | null | undefined): string => v ?? "";
  return {
    programa: d.programa,
    titulo: d.titulo,
    participante1Email: get(p1?.email),
    participante1Cui: get(p1?.cui),
    participante1Nacionalidad: get(p1?.nacionalidad),
    participante1Ciudad: get(p1?.ciudad),
    participante1Telefono: get(p1?.telefono),
    participante1Direccion: get(p1?.direccion),
    participante2Email: get(p2?.email),
    participante2Cui: get(p2?.cui),
    participante2Nacionalidad: get(p2?.nacionalidad),
    participante2Ciudad: get(p2?.ciudad),
    participante2Telefono: get(p2?.telefono),
    participante2Direccion: get(p2?.direccion),
    ...Object.fromEntries(Object.entries(admin).map(([k, v]) => [k, get(v)])),
  };
}
