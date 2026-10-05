import { CalendarRange, Send } from "lucide-react";
import { useId, useState } from "react";
import { useCierre, useProponerFechas } from "../../api/seguimiento.js";
import { Button } from "../ui/button.js";
import { Card, CardEncabezado } from "../ui/card.js";
import { controlClase, Field } from "../ui/field.js";
import { useToast } from "../ui/toast.js";

/** Mañana en Arequipa/Lima (AAAA-MM-DD): primera fecha que se puede proponer. */
function manana(): string {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const d = new Date(`${hoy}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * HU-0038 (RN-05.1): el tesista propone un RANGO de fechas para sustentar; el
 * área elige la fecha definitiva dentro de él con el jurado. Una propuesta
 * nueva reemplaza a la vigente (renegociación, RN-05.2) hasta que haya acta.
 */
export function PropuestaFechasCard({ expedienteId }: { expedienteId: string }) {
  const cierre = useCierre(expedienteId);
  const proponer = useProponerFechas(expedienteId);
  const avisar = useToast();
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const idDesde = useId();
  const idHasta = useId();
  const idComentario = useId();
  const datos = cierre.data;
  if (datos?.sustentacion?.actaVeredicto) return null;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!desde || !hasta) {
      setError("Indica la fecha inicial y la final del rango");
      return;
    }
    if (hasta <= desde) {
      setError("Propón un rango de fechas (al menos dos días), no una fecha única");
      return;
    }
    setError(null);
    try {
      await proponer.mutateAsync({
        desde,
        hasta,
        ...(comentario.trim() ? { comentario: comentario.trim() } : {}),
      });
      avisar("Propuesta de fechas enviada");
      setDesde("");
      setHasta("");
      setComentario("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la propuesta");
    }
  }

  return (
    <Card>
      <CardEncabezado
        titulo="Fechas para tu sustentación"
        descripcion="Propón un rango de fechas en que puedas sustentar; el área coordinará con tu jurado"
      />
      <div className="space-y-3 p-4 md:p-5">
        {datos?.sustentacion && (
          <p className="rounded-lg bg-verde-inst-100 px-3 py-2 text-sm text-navy-950">
            Fecha programada: <strong>{datos.sustentacion.fecha}</strong> a las{" "}
            <strong>{datos.sustentacion.hora}</strong> · {datos.sustentacion.lugar}
          </p>
        )}
        {datos?.propuesta ? (
          <p className="flex items-center gap-1.5 text-sm text-navy-950">
            <CalendarRange size={15} aria-hidden />
            Tu propuesta vigente: del <strong>{datos.propuesta.desde}</strong> al{" "}
            <strong>{datos.propuesta.hasta}</strong>
          </p>
        ) : (
          <p className="text-sm text-grafito-600">
            Aún no registras una propuesta. Indica un rango (no una sola fecha) que deje al menos
            una semana para la citación oficial.
          </p>
        )}
        <form
          aria-label="Proponer fechas de sustentación"
          className="grid grid-cols-1 gap-3 md:grid-cols-[160px_160px_1fr_auto] md:items-end"
          onSubmit={(e) => void onSubmit(e)}
        >
          <Field etiqueta="Desde" htmlFor={idDesde}>
            <input
              className={controlClase}
              id={idDesde}
              min={manana()}
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </Field>
          <Field etiqueta="Hasta" htmlFor={idHasta}>
            <input
              className={controlClase}
              id={idHasta}
              min={desde || manana()}
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </Field>
          <Field etiqueta="Comentario (opcional)" htmlFor={idComentario}>
            <input
              className={controlClase}
              id={idComentario}
              maxLength={500}
              placeholder="Ej. disponible solo por las tardes"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
          </Field>
          <Button disabled={proponer.isPending} type="submit">
            <Send size={15} />
            {datos?.propuesta ? "Actualizar" : "Enviar"}
          </Button>
        </form>
        {error && (
          <p
            className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
