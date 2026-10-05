/**
 * Identidad del participante (HU-0019, RN-L01/L02): el nombre registrado
 * debe coincidir con el del DNI **incluidas las tildes** — la carátula y
 * los decretos se generan con ese texto. Puro, sin I/O.
 */

/** Mayúsculas + espacios colapsados (conserva tildes y Ñ). */
export function normalizarNombre(texto: string): string {
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es-PE");
}

/** Igual que normalizarNombre pero sin diacríticos (solo para diagnóstico). */
export function nombreSinTildes(texto: string): string {
  // NFD separa la letra de su tilde; \p{M} elimina las marcas combinantes.
  return normalizarNombre(texto).normalize("NFD").replace(/\p{M}/gu, "");
}

export type ComparacionNombre = "IGUAL" | "DIFIERE_EN_TILDES" | "DISTINTO";

export function compararNombre(
  registrado: { nombres: string; apellidos: string },
  ingresado: { nombres: string; apellidos: string },
): ComparacionNombre {
  const a = `${registrado.nombres} ${registrado.apellidos}`;
  const b = `${ingresado.nombres} ${ingresado.apellidos}`;
  if (normalizarNombre(a) === normalizarNombre(b)) return "IGUAL";
  if (nombreSinTildes(a) === nombreSinTildes(b)) return "DIFIERE_EN_TILDES";
  return "DISTINTO";
}
