import { Link } from "@tanstack/react-router";
import { CheckCircle2, KeyRound } from "lucide-react";
import { useId, useState } from "react";
import { activarCuentaRequest } from "../api/auth.js";
import { problemaClave } from "../api/clave.js";
import { PantallaAcceso } from "../components/layout/pantalla-acceso.js";
import { Button, botonClases } from "../components/ui/button.js";
import { controlClase, Field } from "../components/ui/field.js";
import { cn } from "../utils/cn.js";

/** Crear/restablecer la clave con el enlace de un solo uso enviado por correo. */
export function ActivarPage() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [clave, setClave] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState<string | null>(null);
  const idClave = useId();
  const idConfirmar = useId();

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const problema = problemaClave(clave, confirmacion);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setCargando(true);
    try {
      const r = await activarCuentaRequest(token, clave);
      setListo(r.dni);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar la cuenta");
    } finally {
      setCargando(false);
    }
  }

  if (listo !== null) {
    return (
      <PantallaAcceso subtitulo="Clave creada">
        <div className="space-y-3 text-center">
          <CheckCircle2 size={40} className="mx-auto text-verde-inst-700" aria-hidden />
          <p className="text-sm text-navy-950">
            Tu clave quedó registrada. Ingresa con tu DNI{listo ? ` (${listo})` : ""} y la nueva
            clave.
          </p>
          <Link className={cn(botonClases({ tamano: "lg" }), "w-full")} to="/login">
            Ir al inicio de sesión
          </Link>
        </div>
      </PantallaAcceso>
    );
  }

  if (!token) {
    return (
      <PantallaAcceso subtitulo="Enlace incompleto">
        <p className="text-sm text-navy-950">
          El enlace no contiene el código de acceso. Abre el enlace completo del correo o solicita
          uno nuevo.
        </p>
        <Link className={cn(botonClases({ variante: "contorno" }), "w-full")} to="/restablecer">
          Solicitar un nuevo enlace
        </Link>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso subtitulo="Crea tu clave de acceso">
      <form aria-label="Crear clave" className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <p className="text-xs text-grafito-600">
          Usa al menos 8 caracteres con letras y números. El enlace solo puede usarse una vez.
        </p>
        <Field etiqueta="Nueva clave" htmlFor={idClave}>
          <input
            autoComplete="new-password"
            className={controlClase}
            id={idClave}
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </Field>
        <Field etiqueta="Repite la clave" htmlFor={idConfirmar}>
          <input
            autoComplete="new-password"
            className={controlClase}
            id={idConfirmar}
            type="password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
          />
        </Field>
        {error && (
          <p
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button className="w-full" disabled={cargando} tamano="lg" type="submit">
          <KeyRound size={16} />
          {cargando ? "Guardando…" : "Guardar clave"}
        </Button>
      </form>
    </PantallaAcceso>
  );
}
