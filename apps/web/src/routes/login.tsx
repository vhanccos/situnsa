export function LoginPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-8">
      <h1 className="text-xl font-bold">Iniciar sesión</h1>
      <p className="text-sm text-slate-600">DNI / correo + Google UNSA (híbrido, RNF-01).</p>
      <input className="w-full rounded border px-3 py-2" placeholder="DNI o correo" />
      <input className="w-full rounded border px-3 py-2" placeholder="Contraseña" type="password" />
    </main>
  );
}
