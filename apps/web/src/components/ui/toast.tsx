import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

interface Toast {
  id: number;
  texto: string;
  tipo: "ok" | "error" | "aviso";
}

const Ctx = createContext<{ avisar: (texto: string, tipo?: Toast["tipo"]) => void }>({
  avisar: () => {},
});

/** Toast/Alert §14.1: confirmaciones y errores no intrusivos. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const avisar = useCallback((texto: string, tipo: Toast["tipo"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, texto, tipo }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);
  const valor = useMemo(() => ({ avisar }), [avisar]);
  return (
    <Ctx.Provider value={valor}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            className={
              t.tipo === "error"
                ? "rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-900 shadow"
                : t.tipo === "aviso"
                  ? "rounded-lg border border-yellow-300 bg-aviso-100 px-4 py-2 text-sm text-aviso-800 shadow"
                  : "rounded-lg border border-green-300 bg-verde-inst-100 px-4 py-2 text-sm text-verde-inst-700 shadow"
            }
            key={t.id}
          >
            {t.texto}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): (texto: string, tipo?: Toast["tipo"]) => void {
  return useContext(Ctx).avisar;
}
