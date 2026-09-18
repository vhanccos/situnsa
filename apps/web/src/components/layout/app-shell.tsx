import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "../../api/session.js";
import { cn } from "../../utils/cn.js";

interface Item {
  to: string;
  etiqueta: string;
}

function navPorRol(rol: string | undefined): Item[] {
  if (rol === "TESISTA") return [{ to: "/mi-tramite", etiqueta: "Mi Trámite" }];
  if (rol === "ASESOR" || rol === "JURADO") return [{ to: "/asesor", etiqueta: "Mis Alumnos" }];
  return [
    { to: "/admin", etiqueta: "Listado de Expedientes" },
    { to: "/expedientes/nuevo", etiqueta: "Nuevo Expediente" },
    { to: "/inscripciones", etiqueta: "Validación" },
    { to: "/talleres", etiqueta: "Taller de Tesis" },
    { to: "/asesores", etiqueta: "Asesores" },
  ];
}

/** AppShell §14.1: sidebar + topbar + área de contenido; exige sesión. */
export function AppShell({ children, activo }: { children: ReactNode; activo: string }) {
  const { sesion, salir } = useSession();
  const navigate = useNavigate();

  if (!sesion) {
    return (
      <main className="mx-auto max-w-md p-8 text-center">
        <p className="text-sm text-grafito-600">Debes iniciar sesión.</p>
        <Link className="text-sm text-navy-800 underline" to="/login">
          Ir al login
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen md:flex">
      <aside className="bg-navy-950 text-white md:flex md:w-60 md:flex-col">
        <div className="border-b border-white/10 p-4">
          <p className="text-sm font-bold">SISTEMA DE TITULACIÓN</p>
          <p className="text-xs text-navy-100">Segunda Especialidad - FIPS UNSA</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col" aria-label="Menú principal">
          {navPorRol(sesion.rol).map((i) => (
            <Link
              className={cn(
                "whitespace-nowrap rounded px-3 py-2 text-sm",
                activo === i.to ? "bg-guinda-700 font-semibold" : "hover:bg-white/10",
              )}
              key={i.to}
              to={i.to}
            >
              {i.etiqueta}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden p-4 text-xs text-navy-100 md:block">
          <p className="font-semibold text-white">{sesion.nombres}</p>
          <p>
            DNI {sesion.dni} · {sesion.rol.replace("_", " ")}
          </p>
          <button
            className="mt-2 underline"
            onClick={() => {
              salir();
              void navigate({ to: "/login" });
            }}
            type="button"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 border-b bg-white px-4 py-2 md:hidden">
          <span className="truncate text-xs text-grafito-600">
            {sesion.nombres} · {sesion.rol}
          </span>
          <button
            className="text-xs underline"
            onClick={() => {
              salir();
              void navigate({ to: "/login" });
            }}
            type="button"
          >
            Salir
          </button>
        </div>
        <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
