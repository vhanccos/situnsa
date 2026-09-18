import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, FileText, Users } from "lucide-react";
import { useState } from "react";
import { useProgramas } from "../api/catalogos.js";
import { useInscribir } from "../api/expedientes.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button, botonClases } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { controlClase, Field } from "../components/ui/field.js";
import { FormSection } from "../components/ui/form-section.js";
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
  const programas = useProgramas();
  const [programa, setPrograma] = useState("Seleccione");
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
        <Card className="mx-auto max-w-md space-y-3 p-8 text-center">
          <CheckCircle2 size={44} className="mx-auto text-verde-inst-700" aria-hidden />
          <h1 className="text-lg font-bold text-navy-950">Expediente {creado.codigo} creado</h1>
          <p className="text-sm text-grafito-600">Pendiente de validación administrativa.</p>
          <div className="flex justify-center gap-2 pt-1">
            <Link
              className={cn(botonClases({ variante: "primario" }))}
              to="/expedientes/$id"
              params={{ id: creado.id }}
            >
              Abrir expediente
            </Link>
            <Button
              variante="contorno"
              onClick={() => void navigate({ to: "/inscripciones" })}
              type="button"
            >
              Ir a validación
            </Button>
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell activo="/expedientes/nuevo">
      <PageHeader
        titulo="Registro de Nuevo Expediente"
        descripcion="Uno o dos participantes. El sistema genera código y seguimiento."
      />
      <fieldset className="flex w-fit gap-1 rounded-full border border-slate-300 bg-white p-1 shadow-card">
        <legend className="sr-only">N° de Participantes</legend>
        {[
          { v: false, l: "1 PARTICIPANTE" },
          { v: true, l: "2 PARTICIPANTES" },
        ].map((o) => (
          <button
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold transition-colors",
              dos === o.v
                ? "bg-navy-950 text-white shadow-card"
                : "text-grafito-600 hover:text-navy-950",
            )}
            key={o.l}
            onClick={() => setDos(o.v)}
            type="button"
            aria-pressed={dos === o.v}
          >
            {o.l}
          </button>
        ))}
      </fieldset>
      <FormSection
        icono={<FileText size={16} />}
        titulo="REGISTRO DEL TÍTULO DE TESIS"
        ayuda="Información obligatoria para la generación de documentos."
      >
        <Field etiqueta="Título de la tesis" className="col-span-full">
          <textarea
            className={controlClase}
            placeholder="Ejemplo: diseño e implementación de un sistema web para la gestión de expedientes de titulación"
            rows={3}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </Field>
        {avisosTitulo.length > 0 && (
          <ul className="col-span-full space-y-0.5">
            {avisosTitulo.map((a) => (
              <li className="text-xs font-medium text-aviso-800" key={a}>
                ⓘ {a}
              </li>
            ))}
          </ul>
        )}
        <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select label="PROGRAMA" value={programa} onChange={setPrograma}>
            <option value="Seleccione">Seleccione</option>
            {(programas.data ?? []).map((p) => (
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
      </FormSection>
      <BloqueParticipante n={1} p={p1} set={setP1} />
      {dos && <BloqueParticipante n={2} p={p2} set={setP2} />}
      {error && (
        <p
          className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {paso >= 0 && (
        <Card className="p-4" aria-live="polite">
          <p className="text-sm font-bold text-navy-950">{PASOS[paso]}…</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-verde-inst-700 transition-all"
              style={{ width: `${((paso + 1) / PASOS.length) * 100}%` }}
            />
          </div>
        </Card>
      )}
      <div>
        <Button
          tamano="lg"
          disabled={inscribir.isPending}
          onClick={() => void registrar()}
          type="button"
        >
          {inscribir.isPending ? "Registrando…" : "REGISTRAR"}
        </Button>
      </div>
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
    <Field etiqueta={label}>
      <input
        className={cn(controlClase, "h-9 font-normal")}
        placeholder={placeholder}
        value={p[k]}
        onChange={(e) => set({ ...p, [k]: e.target.value })}
      />
    </Field>
  );
  return (
    <FormSection
      icono={<Users size={16} />}
      titulo={`Registro de Participante ${String(n).padStart(2, "0")}`}
      ayuda={n === 1 ? "Datos del primer tesista." : "Datos del segundo tesista."}
    >
      <div className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campo("nombres", "NOMBRES", "Ej. Pérez Quispe")}
        {campo("apellidos", "APELLIDOS", "Ej. Juan Carlos")}
        {campo("dni", "DNI *", "8 dígitos")}
        {campo("cui", "CUI / Código universitario", "20240001")}
        {campo("email", "CORREO ELECTRÓNICO *", "correo@ejemplo.com")}
        {campo("telefono", "TELÉFONO", "Ej. 987654321")}
      </div>
    </FormSection>
  );
}
