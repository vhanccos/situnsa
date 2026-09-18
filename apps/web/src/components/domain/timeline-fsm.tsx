const ETAPAS = [
  "REGISTRADO",
  "EN_PLAN",
  "PLAN_APROBADO",
  "EN_BORRADOR",
  "EN_DICTAMEN",
  "APTO_SUSTENTACION",
  "SUSTENTADO",
  "EN_VALIDACION",
  "EN_APROBACION",
  "TITULO_EMITIDO",
] as const;

export function TimelineFsm({ actual }: { actual: (typeof ETAPAS)[number] }) {
  const idx = ETAPAS.indexOf(actual);
  return (
    <ol className="flex flex-wrap gap-2">
      {ETAPAS.map((e, i) => (
        <li
          key={e}
          className={
            i < idx
              ? "rounded bg-green-600 px-2 py-1 text-xs text-white"
              : i === idx
                ? "rounded bg-slate-900 px-2 py-1 text-xs text-white"
                : "rounded bg-slate-100 px-2 py-1 text-xs text-slate-500"
          }
        >
          {e}
        </li>
      ))}
    </ol>
  );
}
