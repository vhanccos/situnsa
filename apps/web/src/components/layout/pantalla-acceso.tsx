import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Marco institucional de las pantallas públicas (login, activación,
 * restablecimiento): misma identidad visual sin la navegación interna.
 */
export function PantallaAcceso({
  subtitulo,
  children,
}: {
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <main className="login-fondo flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-white">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-dorado-500 bg-white/5 shadow-flotante"
            aria-hidden
          >
            <GraduationCap size={30} className="text-dorado-500" />
          </div>
          <p className="mt-3 text-[11px] font-semibold tracking-[0.18em] text-navy-100 uppercase">
            Universidad Nacional de San Agustín
          </p>
          <div className="mx-auto mt-3 h-px w-24 bg-dorado-500/70" aria-hidden />
          <h1 className="mt-3 text-xl font-bold tracking-wide">SISTEMA DE TITULACIÓN</h1>
          <p className="mt-0.5 text-xs text-navy-100">{subtitulo}</p>
        </div>
        <div className="space-y-4 rounded-2xl bg-white p-6 shadow-flotante">{children}</div>
        <p className="mt-5 text-center text-[11px] text-navy-100/70">
          Uso institucional · Segunda Especialidad FIPS — UNSA
        </p>
      </div>
    </main>
  );
}
