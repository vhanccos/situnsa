import { PROGRAMAS_OFICIALES } from "@pis/domain/dist/expediente/seguimiento-catalogo.js";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useInscribir } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { cn } from "../utils/cn.js";

const PASOS = [
  "Creando expediente",
  "Generando documentos",
  "Inicializar seguimiento",
  "Finalizando",
];

interface Participante {
  nombres: string;
  apellidos: string;
  dni: string;
  cui: string;
  email: string;
  telefono: string;
}

const VACIO: Participante = {
  nombres: "",
  apellidos: "",
  dni: "",
  cui: "",
  email: "",
  telefono: "",
};

/** §10 Registro de Nuevo Expediente: 1–2 participantes, validación, progreso y éxito. */
export function NuevoExpedientePage() {
  const navigate = useNavigate();
  const inscribir = useInscribir();
  const [dos, setDos] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [programa, setPrograma] = useState(PROGRAMAS_OFICIALES[6]?.nombre ?? "");
  const [modalidad, setModalidad] = useState<"TESIS" | "TRABAJO_ACADEMICO" | "ARTICULO">("TESIS");
  const [p1, setP1] = useState<Participante>(VACIO);
  const [p2, setP2] = useState<Participante>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [paso, setPaso] = useState(-1);
  const [creado, setCreado] = useState<{ id: string; codigo: string } | null>(null);

  const avisosTitulo: string[] = [];
  if (/"|“|”/.test(titulo)) avisosTitulo.push("No colocar comillas");
  if (/\.\s*$/.test(titulo.trim())) avisosTitulo.push("No colocar punto final");
  if (/[A-ZÁÉÍÓÚ]{4,}/.test(titulo)) avisosTitulo.push("Escribir en minúscula (tipo oración)");

  function validar(p: Participante): string | null {
    if (!p.nombres.trim() || !p.apellidos.trim()) return "Nombres y apellidos obligatorios";
    if (!/^\d{8}$/.test(p.dni)) return `DNI inválido: ${p.dni || "(vacío)"} (8 dígitos)`;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.email))
      return `Correo inválido: ${p.email || "(vacío)"}`;
    return null;
  }

  async function registrar(): Promise<void> {
    setError(null);
    const e1 = validar(p1);
    if (e1) {
      setError(`Participante 01: ${e1}`);
      return;
    }
    if (dos) {
      const e2 = validar(p2);
      if (e2) {
        setError(`Participante 02: ${e2}`);
        return;
      }
      if (p2.dni === p1.dni) {
        setError("DNIs duplicados");
        return;
      }
    }
    if (titulo.trim().length < 10) {
      setError("El título debe tener al menos 10 caracteres");
      return;
    }
    setPaso(0);
    const temporizadores: ReturnType<typeof setTimeout>[] = [];
    for (let i = 1; i < PASOS.length; i++) {
      temporizadores.push(setTimeout(() => setPaso(i), i * 600));
    }
    try {
      const out = await inscribir.mutateAsync({
        modalidad,
        programa,
        titulo: titulo.trim(),
        participante1: {
          nombres: p1.nombres.trim(),
          apellidos: p1.apellidos.trim(),
          dni: p1.dni,
          cui: p1.cui || undefined,
          email: p1.email.trim(),
          telefono: p1.telefono || undefined,
        },
        ...(dos
          ? {
              participante2: {
                nombres: p2.nombres.trim(),
                apellidos: p2.apellidos.trim(),
                dni: p2.dni,
                cui: p2.cui || undefined,
                email: p2.email.trim(),
                telefono: p2.telefono || undefined,
              },
            }
          : {}),
      });
      setCreado(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar");
    } finally {
      temporizadores.forEach(clearTimeout);
      setPaso(-1);
    }
  }

  if (creado) {
    return (
      <AppShell activo="/expedientes/nuevo">
        <div className="mx-auto max-w-md space-y-4 rounded-lg bg-white p-8 text-center">
          <p className="text-4xl" aria-hidden>
            ✓
          </p>
          <h1 className="text-lg font-bold">Expediente {creado.codigo} creado</h1>
          <p className="text-sm text-grafito-600">Pendiente de validación administrativa.</p>
          <div className="flex justify-center gap-2">
            <Link
              className="rounded bg-guinda-800 px-4 py-2 text-sm font-semibold text-white"
              to="/expedientes/$id"
              params={{ id: creado.id }}
            >
              Abrir expediente
            </Link>
            <button
              className="rounded border px-4 py-2 text-sm"
              onClick={() => void navigate({ to: "/inscripciones" })}
              type="button"
            >
              Ir a validación
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activo="/expedientes/nuevo">
      <PageHeader
        titulo="Registro de Nuevo Expediente"
        descripcion="Uno o dos participantes. El sistema genera código y seguimiento."
      />
      <fieldset className="flex gap-2">
        <legend className="sr-only">N° de Participantes</legend>
        {[
          { v: false, l: "1 PARTICIPANTE" },
          { v: true, l: "2 PARTICIPANTES" },
        ].map((o) => (
          <button
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              dos === o.v ? "border-navy-950 bg-navy-950 text-white" : "bg-white",
            )}
            key={o.l}
            onClick={() => setDos(o.v)}
            type="button"
          >
            {o.l}
          </button>
        ))}
      </fieldset>
      <section className="rounded-lg border-l-4 border-l-guinda-800 bg-white p-4">
        <h2 className="text-sm font-bold">REGISTRO DEL TÍTULO DE TESIS</h2>
        <p className="text-xs text-grafito-600">
          Información obligatoria para la generación de documentos
        </p>
        <textarea
          className="mt-2 w-full rounded border px-3 py-2 text-sm"
          placeholder="Ejemplo: diseño e implementación de un sistema web para la gestión de expedientes de titulación"
          rows={3}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        {avisosTitulo.map((a) => (
          <p className="text-xs text-aviso-800" key={a}>
            ℹ️ {a}
          </p>
        ))}
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
          <Select label="PROGRAMA" value={programa} onChange={setPrograma}>
            {PROGRAMAS_OFICIALES.map((p) => (
              <option key={p.codigo} value={p.nombre}>
                {p.nombre}
              </option>
            ))}
          </Select>
          <Select
            label="MODALIDAD"
            value={modalidad}
            onChange={(v) => setModalidad(v as typeof modalidad)}
          >
            <option value="TESIS">Plan de Tesis</option>
            <option value="TRABAJO_ACADEMICO">Plan de Trabajo Académico</option>
            <option value="ARTICULO">Plan de Tesis Formato Artículo</option>
          </Select>
        </div>
      </section>
      <BloqueParticipante n={1} p={p1} set={setP1} />
      {dos && <BloqueParticipante n={2} p={p2} set={setP2} />}
      {error && (
        <p
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {paso >= 0 && (
        <div className="rounded-lg bg-white p-4" aria-live="polite">
          <p className="text-sm font-bold">{PASOS[paso]}…</p>
          <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
            <div
              className="h-full bg-verde-inst-700 transition-all"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <button
        className="rounded bg-guinda-800 px-6 py-2.5 text-sm font-bold text-white hover:bg-guinda-700 disabled:opacity-60"
        disabled={inscribir.isPending}
        onClick={() => void registrar()}
        type="button"
      >
        {inscribir.isPending ? "Registrando…" : "REGISTRAR"}
      </button>
    </AppShell>
  );
}

function BloqueParticipante({
  n,
  p,
  set,
}: {
  n: number;
  p: Participante;
  set: (v: Participante) => void;
}) {
  const campo = (k: keyof Participante, label: string, placeholder?: string): React.ReactNode => (
    <label className="block text-xs font-semibold">
      {label}
      <input
        className="mt-1 w-full rounded border px-2 py-2 text-sm font-normal"
        placeholder={placeholder}
        value={p[k]}
        onChange={(e) => set({ ...p, [k]: e.target.value })}
      />
    </label>
  );
  return (
    <section className="rounded-lg bg-white p-4">
      <h2 className="text-sm font-bold">Registro de Participante {String(n).padStart(2, "0")}</h2>
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {campo("nombres", "NOMBRES", "Ej. Pérez Quispe")}
        {campo("apellidos", "APELLIDOS", "Ej. Juan Carlos")}
        {campo("dni", "DNI *", "8 dígitos")}
        {campo("cui", "CUI / Código universitario", "20240001")}
        {campo("email", "CORREO ELECTRÓNICO *", "correo@ejemplo.com")}
        {campo("telefono", "TELÉFONO", "Ej. 987654321")}
      </div>
    </section>
  );
}
