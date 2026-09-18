import { semaforoPlazo } from "@pis/domain/dist/expediente/dias-habiles.js";
import { SemaforoBadge } from "../components/domain/semaforo-badge.js";
import { TimelineFsm } from "../components/domain/timeline-fsm.js";
import { Button } from "../components/ui/button.js";

export function HomePage() {
  const estado = semaforoPlazo(4);
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">PIS Titulación — FIPS / UNSA</h1>
      <p className="text-slate-600">
        Skeleton verificado: Vite SPA + TanStack Router/Query + contratos ts-rest.
      </p>
      <TimelineFsm actual="EN_PLAN" />
      <SemaforoBadge estado={estado} dias={4} />
      <div className="flex gap-2">
        <Button>Inscribir plan (RF-01)</Button>
        <a
          className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-100"
          href="/expedientes/33333333-3333-4333-8333-333333333333"
        >
          Ver expediente SET005 (demo)
        </a>
      </div>
    </main>
  );
}
