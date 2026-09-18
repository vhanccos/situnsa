import type { ActualizarDatosInput, ExpedienteDetalleDTO } from "@pis/contracts";
import {
  ETIQUETAS_MODALIDAD,
  ETIQUETAS_MODALIDAD_FINAL,
  modalidadAEtiqueta,
} from "@pis/domain/dist/expediente/modalidades.js";
import { PROGRAMAS_OFICIALES } from "@pis/domain/dist/expediente/seguimiento-catalogo.js";
import { useEffect, useId, useRef, useState } from "react";
import { type GuardadoEstado, useActualizarDatos } from "../../api/expedientes.js";
import { cn } from "../../utils/cn.js";

type Clave = keyof ActualizarDatosInput;

interface DefCampo {
  clave: Clave | null;
  label: string;
  control:
    | "texto"
    | "email"
    | "fecha"
    | "hora"
    | "area"
    | "modalidad"
    | "modalidad-final"
    | "programas";
  lectura?: string;
}

function Campo({
  def,
  value,
  onChange,
}: {
  def: DefCampo;
  value: string;
  onChange?: ((v: string) => void) | undefined;
}) {
  const ro = def.clave === null;
  const cls = cn(
    "mt-1 w-full rounded border px-2 py-1.5 text-sm",
    ro ? "bg-slate-50 text-slate-500" : "bg-white",
  );
  const controlId = useId();
  return (
    <div className="block">
      <label className="text-xs font-medium text-grafito-600" htmlFor={controlId}>
        {def.label}
      </label>
      {def.control === "area" ? (
        <textarea
          id={controlId}
          className={cls}
          readOnly={ro}
          rows={2}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      ) : def.control === "modalidad" ? (
        <select
          id={controlId}
          className={cls}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          {ETIQUETAS_MODALIDAD.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : def.control === "modalidad-final" ? (
        <select
          id={controlId}
          className={cls}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          <option value="">—</option>
          {ETIQUETAS_MODALIDAD_FINAL.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : def.control === "programas" ? (
        <select
          id={controlId}
          className={cls}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        >
          <option value="Seleccione">Seleccione</option>
          {PROGRAMAS_OFICIALES.map((p) => (
            <option key={p.codigo} value={p.nombre}>
              {p.nombre}
            </option>
          ))}
          {!PROGRAMAS_OFICIALES.some((p) => p.nombre === value) &&
            value !== "Seleccione" &&
            value !== "" && <option value={value}>{value} (no oficial)</option>}
        </select>
      ) : (
        <input
          id={controlId}
          className={cls}
          readOnly={ro}
          type={
            def.control === "fecha"
              ? "date"
              : def.control === "hora"
                ? "time"
                : def.control === "email"
                  ? "email"
                  : "text"
          }
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
      )}
    </div>
  );
}

/** Orden y controles exactos del formulario legacy (Dashboard.html #tab-datos). */
const PERSONA_1: DefCampo[] = [
  { clave: null, label: "NOMBRES", control: "texto", lectura: "p1nombre" },
  { clave: "programa", label: "PROGRAMAS", control: "programas" },
  { clave: "titulo", label: "TESIS", control: "area" },
  { clave: null, label: "DNI", control: "texto", lectura: "p1dni" },
  { clave: "modalidad", label: "MODALIDAD", control: "modalidad" },
  { clave: "participante1Email", label: "CORREO", control: "email" },
  { clave: "participante1Cui", label: "CUI", control: "texto" },
  { clave: "participante1Nacionalidad", label: "NACIONALIDAD", control: "texto" },
  { clave: "participante1Ciudad", label: "CIUDAD", control: "texto" },
  { clave: "participante1Telefono", label: "TELÉFONO", control: "texto" },
  { clave: "participante1Direccion", label: "DIRECCIÓN", control: "texto" },
];

const PERSONA_2: DefCampo[] = [
  { clave: null, label: "NOMBRES 02", control: "texto", lectura: "p2nombre" },
  { clave: null, label: "PROGRAMAS 02", control: "texto", lectura: "programa02" },
  { clave: "titulo02", label: "TESIS 02", control: "area" },
  { clave: null, label: "DNI 02", control: "texto", lectura: "p2dni" },
  { clave: "modalidad02", label: "MODALIDAD 02", control: "modalidad" },
  { clave: "participante2Email", label: "CORREO 02", control: "email" },
  { clave: "participante2Cui", label: "CUI 02", control: "texto" },
  { clave: "participante2Nacionalidad", label: "NACIONALIDAD 02", control: "texto" },
  { clave: "participante2Ciudad", label: "CIUDAD 02", control: "texto" },
  { clave: "participante2Telefono", label: "TELÉFONO 02", control: "texto" },
  { clave: "participante2Direccion", label: "DIRECCIÓN 02", control: "texto" },
];

/** ETAPA 01 · DATOS DE DOCUMENTOS (card legacy exacta). */
const DATOS_DOCUMENTOS: DefCampo[] = [
  { clave: "nroDecreto", label: "N° DECRETO", control: "texto" },
  { clave: "recomendacion", label: "RECOMENDACIÓN", control: "texto" },
  { clave: "presidente", label: "PRESIDENTE", control: "texto" },
  { clave: "asesorNombre", label: "ASESOR", control: "texto" },
  { clave: "secretario", label: "SECRETARIO", control: "texto" },
  { clave: "coAsesor", label: "CO ASESOR", control: "texto" },
  { clave: "fechaApertura", label: "FECHA APERTURA", control: "fecha" },
  { clave: "fechaPresentacion", label: "FECHA PRESENTACIÓN", control: "fecha" },
  { clave: "nroOficio", label: "N° OFICIO", control: "texto" },
];

const ETAPA_02: DefCampo[] = [
  { clave: "integrante", label: "INTEGRANTE", control: "texto" },
  { clave: "presidenteE2", label: "PRESIDENTE ETAPA 02", control: "texto" },
  { clave: "secretarioE2", label: "SECRETARIO ETAPA 02", control: "texto" },
  { clave: "suplenteE2", label: "SUPLENTE ETAPA 02", control: "texto" },
  { clave: "decanal", label: "DECANAL", control: "texto" },
  { clave: "fechaSustentacion", label: "FECHA", control: "fecha" },
  { clave: "horaSustentacion", label: "HORA", control: "hora" },
  { clave: "lugarSustentacion", label: "LUGAR SUSTENTACIÓN", control: "texto" },
  { clave: "modalidadFinal", label: "MODALIDAD VIRTUAL", control: "modalidad-final" },
];

/**
 * Pestaña Datos §6 con la estructura legacy exacta:
 * grupo 1 → una card ETAPA 01; grupo 2 → DATOS PERSONALES + DATOS DE DOCUMENTOS.
 * Autoguardado 650ms con los estados del legacy (activarAutoguardadoAdminV4).
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
  const grupo2 = detalle.participante2 !== null;
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
      case "p2nombre":
        return p2 ? `${p2.nombres} ${p2.apellidos}`.trim() : "—";
      case "p2dni":
        return p2?.dni ?? "—";
      case "programa02":
        return detalle.programa;
      default:
        return "";
    }
  }

  function editar(clave: Clave, v: string): void {
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
    }, 650);
  }

  function grid(campos: DefCampo[]) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {campos.map((c) => (
          <Campo
            def={c}
            key={c.label}
            value={c.clave === null ? lectura(c.lectura ?? "") : (valores[c.clave] ?? "")}
            onChange={c.clave === null ? undefined : (v) => editar(c.clave as Clave, v)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!grupo2 && (
        <section className="rounded-lg bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">ETAPA 01</h2>
          {grid(PERSONA_1)}
          <h3 className="mb-3 mt-5 text-xs font-bold tracking-wide text-grafito-600">
            DATOS DE DOCUMENTOS
          </h3>
          {grid(DATOS_DOCUMENTOS)}
        </section>
      )}
      {grupo2 && (
        <>
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-3 text-sm font-bold">ETAPA 01 · DATOS PERSONALES</h2>
            <h3 className="mb-3 text-xs font-bold tracking-wide text-grafito-600">
              PARTICIPANTE 01
            </h3>
            {grid(PERSONA_1)}
            <h3 className="mb-3 mt-5 text-xs font-bold tracking-wide text-grafito-600">
              PARTICIPANTE 02
            </h3>
            {grid(PERSONA_2)}
          </section>
          <section className="rounded-lg bg-white p-4">
            <h2 className="mb-3 text-sm font-bold">ETAPA 01 · DATOS DE DOCUMENTOS</h2>
            {grid(DATOS_DOCUMENTOS)}
          </section>
        </>
      )}
      <section className="rounded-lg bg-white p-4">
        <h2 className="mb-3 text-sm font-bold">ETAPA 02</h2>
        {grid(ETAPA_02)}
      </section>
    </div>
  );
}

function extraer(d: ExpedienteDetalleDTO): Record<string, string> {
  const p1 = d.participante1;
  const p2 = d.participante2;
  const admin = d.datosAdmin as unknown as Record<string, string | null>;
  const get = (v: string | null | undefined): string => v ?? "";
  return {
    programa: d.programa,
    titulo: d.titulo,
    titulo02: get(admin.titulo02),
    modalidad: modalidadAEtiqueta(d.modalidad),
    modalidad02: get(admin.modalidad02) || modalidadAEtiqueta(d.modalidad),
    modalidadFinal: get(admin.modalidadFinal),
    asesorNombre:
      get(admin["asesorNombre"]) || (d.asesor ? `${d.asesor.nombres} ${d.asesor.apellidos}` : ""),
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
