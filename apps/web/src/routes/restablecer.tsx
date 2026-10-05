import { Link } from "@tanstack/react-router";
import { MailCheck, Send } from "lucide-react";
import { useId, useState } from "react";
import { solicitarRestablecimientoRequest } from "../api/auth.js";
import { PantallaAcceso } from "../components/layout/pantalla-acceso.js";
import { Button, botonClases } from "../components/ui/button.js";
import { controlClase, Field } from "../components/ui/field.js";
import { cn } from "../utils/cn.js";

/**
 * «¿Primera vez u olvidaste tu clave?»: envía un enlace de un solo uso al
 * correo registrado. La respuesta es la misma exista o no la cuenta.
 */
export function RestablecerPage() {
  const [identificador, setIdentificador] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (identificador.trim().length < 2) return;
    setCargando(true);
    setError(null);
    try {
      await solicitarRestablecimientoRequest(identificador.trim());
      setEnviado(true);
    } catch {
      setError("No se pudo procesar la solicitud. Inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  if (enviado) {
    return (
      <PantallaAcceso subtitulo="Revisa tu correo">
        <div className="space-y-3 text-center">
          <MailCheck size={40} className="mx-auto text-verde-inst-700" aria-hidden />
          <p className="text-sm text-navy-950">
            Si los datos corresponden a una cuenta registrada, enviamos un enlace al correo
            asociado. Vence en 72 horas y solo puede usarse una vez.
          </p>
          <Link className={cn(botonClases({ variante: "contorno" }), "w-full")} to="/login">
            Volver al inicio de sesión
          </Link>
        </div>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso subtitulo="Acceso al portal">
      <form aria-label="Solicitar enlace" className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
        <p className="text-xs text-grafito-600">
          Ingresa tu DNI, CUI o correo. Te enviaremos un enlace para crear o restablecer tu clave.
        </p>
        <Field etiqueta="DNI, CUI o correo" htmlFor={id}>
          <input
            autoComplete="username"
            className={controlClase}
            id={id}
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
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
        <Button
          className="w-full"
          disabled={cargando || identificador.trim().length < 2}
          tamano="lg"
          type="submit"
        >
          <Send size={16} />
          {cargando ? "Enviando…" : "Enviar enlace"}
        </Button>
        <p className="text-center text-xs">
          <Link className="font-semibold text-navy-800 hover:underline" to="/login">
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    </PantallaAcceso>
  );
}
