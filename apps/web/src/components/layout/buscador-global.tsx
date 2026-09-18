import { useNavigate } from "@tanstack/react-router";
import { FileSearch, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useListarExpedientes } from "../../api/expedientes.js";
import { useSession } from "../../api/session.js";
import { cn } from "../../utils/cn.js";
import { Dialogo } from "../ui/dialog.js";
import { controlClase } from "../ui/field.js";

/**
 * Buscador global ⌘K: por código, tesista o DNI (respeta el alcance por rol).
 * Atajo + botón en el sidebar.
 */
export function BuscadorGlobal() {
  const { sesion } = useSession();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function atajo(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    }
    window.addEventListener("keydown", atajo);
    return () => window.removeEventListener("keydown", atajo);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(q.trim());
      setCursor(0);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (abierto) {
      setQ("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [abierto]);

  const alcancePropio =
    sesion?.rol === "TESISTA" || sesion?.rol === "ASESOR" || sesion?.rol === "JURADO";
  const query = useListarExpedientes({
    q: abierto ? debounced : "",
    estado: "",
    orden: "recientes",
    ...(alcancePropio ? { vista: "mis" as const } : {}),
  });
  const items = (query.data?.items ?? []).slice(0, 8);
  const cursorSeguro = Math.min(cursor, Math.max(items.length - 1, 0));

  function ir(id: string): void {
    setAbierto(false);
    if (sesion?.rol === "TESISTA") {
      void navigate({ to: "/mi-tramite" });
    } else {
      void navigate({ to: "/expedientes/$id", params: { id } });
    }
  }

  return (
    <>
      <button
        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
        onClick={() => setAbierto(true)}
        type="button"
      >
        <Search size={17} className="shrink-0" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold">
          ⌘K
        </kbd>
      </button>
      <Dialogo
        abierto={abierto}
        onAbierto={setAbierto}
        titulo="Buscar expediente"
        descripcion="Por código, tesista o DNI."
        ancho="max-w-lg"
      >
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-grafito-600"
            aria-hidden
          />
          <input
            aria-label="Buscar expediente"
            className={cn(controlClase, "h-10 pl-9")}
            placeholder="SET005, María Torres, 12345678…"
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === "Enter" && items[cursorSeguro]) {
                ir(items[cursorSeguro].id);
              }
            }}
          />
        </div>
        <div className="mt-2 max-h-72 overflow-y-auto">
          {query.isPending && debounced !== "" ? (
            <p className="px-1 py-4 text-center text-sm text-grafito-600">Buscando…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-1 py-6 text-center">
              <FileSearch size={22} className="text-grafito-600" aria-hidden />
              <p className="text-sm text-grafito-600">
                {debounced === ""
                  ? "Escribe para buscar en tus expedientes visibles."
                  : "Sin coincidencias."}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {items.map((f, i) => (
                <li key={f.id}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      i === cursorSeguro ? "bg-navy-950/[0.06]" : "hover:bg-slate-50",
                    )}
                    onClick={() => ir(f.id)}
                    onMouseEnter={() => setCursor(i)}
                    type="button"
                  >
                    <span className="min-w-0">
                      <strong className="text-navy-950">{f.codigo}</strong>
                      <span className="block truncate text-xs text-grafito-600">
                        {f.tesista} · DNI {f.dni}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-grafito-600">
                      {f.avancePct}%
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="mt-2 border-t border-slate-200/70 pt-2 text-[11px] text-grafito-600">
          ↑↓ navegar · ↵ abrir · esc cerrar
        </p>
      </Dialogo>
    </>
  );
}
