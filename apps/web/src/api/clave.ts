/** Política mínima de clave (la valida también el servidor): 8+ caracteres, letras y números. */
export function problemaClave(clave: string, confirmacion: string): string | null {
  if (clave.length < 8) return "La clave debe tener al menos 8 caracteres";
  if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(clave)) return "La clave debe incluir letras";
  if (!/\d/.test(clave)) return "La clave debe incluir números";
  if (clave !== confirmacion) return "Las claves no coinciden";
  return null;
}
