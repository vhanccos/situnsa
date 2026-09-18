import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { destinoPorRol } from "../api/auth.js";
import { useSession } from "../api/session.js";

/** §3 Login: acceso, "Validando credenciales…", error controlado, navegación por rol. */
export function LoginPage() {
  const { entrar, sesion } = useSession();
  const navigate = useNavigate();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sesion) {
    void navigate({ to: destinoPorRol(sesion.rol) });
    return null;
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (cargando) return;
    setError(null);
    setCargando(true);
    try {
      const s = await entrar(identificador.trim(), password);
      void navigate({ to: destinoPorRol(s.rol) });
    } catch {
      setError("Credenciales inválidas o usuario inactivo");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-navy-950 p-4">
      <form
        aria-label="Iniciar sesión"
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl"
        onSubmit={(e) => {
          void onSubmit(e);
        }}
      >
        <div className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950 text-xl text-white"
            aria-hidden
          >
            🎓
          </div>
          <h1 className="mt-2 text-lg font-bold text-navy-950">SISTEMA DE TITULACIÓN</h1>
          <p className="text-xs text-grafito-600">Segunda Especialidad - FIPS UNSA</p>
        </div>
        <label className="block">
          <span className="text-xs font-semibold">USUARIO</span>
          <input
            autoComplete="username"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="DNI, CUI o correo"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold">CONTRASEÑA</span>
          <input
            autoComplete="current-password"
            className="mt-1 w-full rounded border px-3 py-2 text-sm"
            placeholder="Ingrese su contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p
            className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          className="w-full rounded bg-guinda-800 py-2.5 text-sm font-bold text-white hover:bg-guinda-700 disabled:opacity-60"
          disabled={cargando || !identificador || !password}
          type="submit"
        >
          {cargando ? "Validando credenciales…" : "Ingresar"}
        </button>
        <p className="text-center text-xs text-grafito-600">
          Dev: 12345678 (tesista) · 00000001 (admin) · 87654321 (asesor)
        </p>
      </form>
    </main>
  );
}
