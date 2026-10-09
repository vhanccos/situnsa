import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAsesores } from "../api/catalogos.js";
import {
  type CrearTallerInput,
  fechaLarga,
  useCrearTaller,
  useVistaPrevia,
} from "../api/taller.js";
import { AppShell } from "../components/layout/app-shell.js";
import { Button } from "../components/ui/button.js";
import { Card } from "../components/ui/card.js";
import { controlClase, Field } from "../components/ui/field.js";
import { PageHeader } from "../components/ui/page-header.js";
import { Select } from "../components/ui/select.js";
import { useToast } from "../components/ui/toast.js";
import { cn } from "../utils/cn.js";

const DIAS = [
  { n: 1, letra: "L", nombre: "Lunes" },
  { n: 2, letra: "M", nombre: "Martes" },
  { n: 3, letra: "X", nombre: "Miércoles" },
  { n: 4, letra: "J", nombre: "Jueves" },
  { n: 5, letra: "V", nombre: "Viernes" },
  { n: 6, letra: "S", nombre: "Sábado" },
  { n: 7, letra: "D", nombre: "Domingo" },
];

/** P2 Nuevo taller (RF-0200, RF-0201): guarda y abre P3. */
export function TalleresNuevoPage() {
  const avisar = useToast();
  const navigate = useNavigate();
  const crear = useCrearTaller();
  const previa = useVistaPrevia();
  const asesores = useAsesores();
  const [form, setForm] = useState({
    nombre: "",
    periodo: "",
    asesorDni: "",
    fechaInicio: "",
    horaInicio: "09:00",
    horaFin: "11:00",
    totalSesiones: "12",
    cupoMax: "",
    enlace: "",
  });
  const [dias, setDias] = useState<number[]>([]);
  const [error, setError] = useState("");

  function armar(): CrearTallerInput {
    return {
      nombre: form.nombre.trim(),
      ...(form.periodo.trim() ? { periodo: form.periodo.trim() } : {}),
      ...(form.asesorDni ? { asesorDni: form.asesorDni } : {}),
      fechaInicio: form.fechaInicio,
      diasSesion: dias,
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
      totalSesiones: Number(form.totalSesiones),
      cupoMax: Number(form.cupoMax),
      ...(form.enlace.trim() ? { enlace: form.enlace.trim() } : {}),
    };
  }

  // Vista previa automática cuando el formulario está completo.
  const previaRef = useRef(previa.mutate);
  previaRef.current = previa.mutate;
  useEffect(() => {
    if (
      form.nombre.trim().length < 3 ||
      !form.fechaInicio ||
      dias.length === 0 ||
      !form.horaInicio ||
      !form.horaFin ||
      Number(form.totalSesiones) < 1
    ) {
      return;
    }
    const t = setTimeout(() => {
      previaRef.current(
        {
          nombre: form.nombre.trim(),
          fechaInicio: form.fechaInicio,
          diasSesion: dias,
          horaInicio: form.horaInicio,
          horaFin: form.horaFin,
          totalSesiones: Number(form.totalSesiones),
          cupoMax: Number(form.cupoMax) || 1,
        },
        { onError: () => {} },
      );
    }, 600);
    return () => clearTimeout(t);
  }, [form, dias]);

  async function onGuardar(): Promise<void> {
    setError("");
    try {
      const t = await crear.mutateAsync(armar());
      avisar("Taller creado");
      void navigate({ to: "/taller/$id", params: { id: t.id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo crear";
      setError(msg);
      avisar(msg, "error");
    }
  }

  function alternarDia(n: number): void {
    setDias((v) => (v.includes(n) ? v.filter((d) => d !== n) : [...v, n].sort((a, b) => a - b)));
  }

  const vista = previa.data;

  return (
    <AppShell activo="/talleres">
      <PageHeader titulo="Nuevo taller" descripcion="Talleres de Tesis / Nuevo taller" />
      <Card>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3 md:p-5">
          <Field etiqueta="Nombre *">
            <input
              aria-label="Nombre del taller"
              className={cn(controlClase, "h-10")}
              placeholder="Nombre del taller"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Field>
          <Field etiqueta="Período *">
            <input
              aria-label="Período"
              className={cn(controlClase, "h-10")}
              placeholder="Período académico"
              value={form.periodo}
              onChange={(e) => setForm({ ...form, periodo: e.target.value })}
            />
          </Field>
          <Select
            label="DOCENTE ASESOR *"
            value={form.asesorDni}
            onChange={(v) => setForm({ ...form, asesorDni: v })}
          >
            <option value="">Seleccione asesor…</option>
            {(asesores.data ?? []).map((a) => (
              <option key={a.id} value={a.dni}>
                {a.nombres} {a.apellidos} · DNI {a.dni}
              </option>
            ))}
          </Select>
          <Field etiqueta="Fecha de inicio *">
            <input
              aria-label="Fecha de inicio"
              type="date"
              className={cn(controlClase, "h-10")}
              value={form.fechaInicio}
              onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
            />
          </Field>
          <Field etiqueta="Hora de inicio *">
            <input
              aria-label="Hora de inicio"
              type="time"
              className={cn(controlClase, "h-10")}
              value={form.horaInicio}
              onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
            />
          </Field>
          <Field etiqueta="Hora de fin *">
            <input
              aria-label="Hora de fin"
              type="time"
              className={cn(controlClase, "h-10")}
              value={form.horaFin}
              onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
            />
          </Field>
          <div className="md:col-span-3">
            <span className="mb-1 block text-[11px] font-bold tracking-wider text-grafito-600 uppercase">
              Días de sesión *
            </span>
            <div className="flex flex-wrap gap-2">
              {DIAS.map((d) => (
                <button
                  key={d.n}
                  title={d.nombre}
                  aria-label={d.nombre}
                  aria-pressed={dias.includes(d.n)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold",
                    dias.includes(d.n)
                      ? "border-verde-inst-700 bg-verde-inst-700 text-white"
                      : "border-slate-300 bg-white text-grafito-700",
                  )}
                  onClick={() => alternarDia(d.n)}
                  type="button"
                >
                  {d.letra}
                </button>
              ))}
            </div>
          </div>
          <Field etiqueta="Número de sesiones *">
            <input
              aria-label="Número de sesiones"
              type="number"
              min={1}
              max={52}
              className={cn(controlClase, "h-10")}
              value={form.totalSesiones}
              onChange={(e) => setForm({ ...form, totalSesiones: e.target.value })}
            />
          </Field>
          <Field etiqueta="Cupo máximo *">
            <input
              aria-label="Cupo máximo"
              type="number"
              min={1}
              className={cn(controlClase, "h-10")}
              value={form.cupoMax}
              onChange={(e) => setForm({ ...form, cupoMax: e.target.value })}
            />
          </Field>
          <Field etiqueta="Enlace de reunión" ayuda="Opcional. Debe empezar con https://">
            <input
              aria-label="Enlace de reunión"
              className={cn(controlClase, "h-10")}
              placeholder="https://…"
              value={form.enlace}
              onChange={(e) => setForm({ ...form, enlace: e.target.value })}
            />
          </Field>
        </div>
        {vista && (
          <p className="mx-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-grafito-700 md:mx-5">
            Vista previa: se generarán <strong>{vista.sesiones} sesiones</strong>. Primera:{" "}
            {fechaLarga(vista.primera)} · Última: {fechaLarga(vista.ultima)}.
          </p>
        )}
        {error && (
          <p className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 md:px-5">
            {error}
          </p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4 md:p-5">
          <Button
            variante="exito"
            disabled={crear.isPending}
            onClick={() => void onGuardar()}
            type="button"
          >
            Guardar y generar sesiones
          </Button>
          <Button variante="contorno" onClick={() => window.history.back()} type="button">
            Cancelar
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}
