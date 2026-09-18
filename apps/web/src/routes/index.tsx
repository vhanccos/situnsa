import { Link } from "@tanstack/react-router";
import { destinoPorRol } from "../api/auth.js";
import { useSession } from "../api/session.js";

/** Raíz: redirige a la vista según rol o al login. */
export function HomePage() {
  const { sesion } = useSession();
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8 text-center">
      <h1 className="text-2xl font-bold text-navy-950">PIS Titulación — FIPS / UNSA</h1>
      {sesion ? (
        <Link
          className="inline-block rounded bg-guinda-800 px-6 py-2.5 text-sm font-bold text-white"
          to={destinoPorRol(sesion.rol)}
        >
          Ir a mi panel ({sesion.rol.replace("_", " ")})
        </Link>
      ) : (
        <Link
          className="inline-block rounded bg-guinda-800 px-6 py-2.5 text-sm font-bold text-white"
          to="/login"
        >
          Iniciar sesión
        </Link>
      )}
      <p className="text-xs text-grafito-600">
        Dev: expediente demo{" "}
        <a className="underline" href="/expedientes/33333333-3333-4333-8333-333333333333">
          SET005
        </a>
      </p>
    </main>
  );
}
