import type { Semaforo } from "@pis/domain/dist/expediente/dias-habiles.js";
import { cn } from "../../utils/cn.js";

const styles: Record<Semaforo, string> = {
  VERDE: "bg-green-100 text-green-800 border-green-300",
  AMARILLO: "bg-yellow-100 text-yellow-800 border-yellow-300",
  ROJO: "bg-red-100 text-red-800 border-red-300",
};

export function SemaforoBadge({ estado, dias }: { estado: Semaforo; dias: number }) {
  return (
    <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", styles[estado])}>
      {estado} · {dias} d.h.
    </span>
  );
}
