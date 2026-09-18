import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import type { SesionDTO } from "../api/auth.js";
import { loginRequest } from "../api/auth.js";

interface Sesion extends SesionDTO {
  identificador: string;
}

interface ValorSesion {
  sesion: Sesion | null;
  entrar: (identificador: string, password: string) => Promise<Sesion>;
  salir: () => void;
  encabezados: () => Record<string, string>;
}

const CLAVE = "pis-sesion";

const Ctx = createContext<ValorSesion>({
  sesion: null,
  entrar: () => Promise.reject(new Error("SessionProvider ausente")),
  salir: () => {},
  encabezados: () => ({}),
});

function leer(): Sesion | null {
  try {
    const raw = localStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}

/** Sesión stub §19 (Fase 2: Better-Auth). Persiste DNI+rol; el backend autoriza. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(leer);

  const entrar = useCallback(async (identificador: string, password: string): Promise<Sesion> => {
    const dto = await loginRequest(identificador, password);
    const s: Sesion = { ...dto, identificador: dto.dni };
    localStorage.setItem(CLAVE, JSON.stringify(s));
    setSesion(s);
    return s;
  }, []);

  const salir = useCallback(() => {
    localStorage.removeItem(CLAVE);
    setSesion(null);
  }, []);

  const encabezados = useCallback(
    () => (sesion ? { "x-user-dni": sesion.identificador } : {}),
    [sesion],
  );

  const valor = useMemo(
    () => ({ sesion, entrar, salir, encabezados }),
    [sesion, entrar, salir, encabezados],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSession(): ValorSesion {
  return useContext(Ctx);
}

/** fetch con identidad del stub (x-user-dni). */
export async function apiFetch(path: string, init?: RequestInit, dni?: string): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
  };
  const guardado = leer();
  const id = dni ?? guardado?.identificador;
  if (id) headers["x-user-dni"] = id;
  return fetch(path, { ...init, headers });
}
